(function () {
	var isLoadDispatched = false;
	var retryCount = 200;
	var retryDelay = 250;
	var failSafeTimeout = null;
	var previousCommentsLength = -1;
	var stableRetries = 0;
	var maxStableRetries = 4; // Number of retries with same length before parsing
	var debugMode = false; // Set to false to disable debug logging
	var commentsTimeout = null;
	
	debug = function (message) {
		if (debugMode) {
			console.log(message);
		}
	}

	// Extract video details from DOM instead of relying on ytInitialPlayerResponse
	getVideoDetailsFromDOM = function() {
		var videoDetails = {};
		
		// Get video description using the correct element
		var description = '';
		var descElement = document.querySelector('#description #description-inline-expander');
		if (descElement && descElement.text && descElement.text.content) {
			description = descElement.text.content.trim();
		}
		
		// Fallback: try to get from ytInitialPlayerResponse if DOM fails
		if (!description.trim() && window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
			description = window.ytInitialPlayerResponse.videoDetails.shortDescription || '';
			debug('Using fallback ytInitialPlayerResponse for description');
		}
		
		videoDetails.shortDescription = description;
		return videoDetails;
	}
	readyComments = function (data) {
		debug('Ready Comments');
		isLoadDispatched = false;
		clearTimeout(failSafeTimeout);
		window.postMessage(data, '*');
	}
	getComments = function (count) {
		debug('Get comments', count);
		var comments = document.querySelector('ytd-comments#comments');
		var commentsSection = comments && comments.querySelector('#sections #contents');

		if (!isLoadDispatched && comments && comments.$) {
			comments.setAttribute('style', 'position: absolute; top: 0; z-index: -999;');
			window.dispatchEvent(new Event('scroll'));
			isLoadDispatched = true;
			// Failsafe
			failSafeTimeout = setTimeout(function () {
				comments.removeAttribute('style');
			}, 5000);
		}
		
		if (
			comments && 
			commentsSection && 
			commentsSection.children.length > 1
		) {
			var currentCommentsLength = commentsSection.children.length;
			
			// Check if comments section size has stabilized
			if (currentCommentsLength === previousCommentsLength) {
				stableRetries++;
				debug('Comments length stable (' + currentCommentsLength + ') for ' + stableRetries + ' retries');
				
				// Only parse comments if size has been stable for required retries
				if (stableRetries >= maxStableRetries) {
					debug('Comments section stabilized, parsing ' + currentCommentsLength + ' comments');
					var parsedComments = [];
					for (var i = 0; i < commentsSection.children.length; i++) {
						var comment = commentsSection.children[i].querySelector('#comment #content-text');
						if (comment) {
							parsedComments.push(comment.innerText);
						}
					}
					comments.removeAttribute('style');
					// Reset counters for next video
					previousCommentsLength = -1;
					stableRetries = 0;
					
					// Get current video details from DOM
					var videoDetails = getVideoDetailsFromDOM();
					if (videoDetails) {
						readyComments({
							comments: parsedComments,
							videoDetails: videoDetails
						});
					} else {
						debug('Failed to extract video details from DOM');
					}
					return;
				}
			} else {
				// Size changed, reset stability counter
				debug('Comments length changed from ' + previousCommentsLength + ' to ' + currentCommentsLength + ', resetting stability counter');
				stableRetries = 0;
				previousCommentsLength = currentCommentsLength;
			}
			
			// Continue retrying if not stable yet
			if (count < retryCount) {
				commentsTimeout = setTimeout(function () {
					getComments(++count);
				}, retryDelay);
			}
		} else if (count < retryCount) {
			commentsTimeout = setTimeout(function () {
				getComments(++count);
			}, retryDelay);
		}
	}

	window.onload = function () {
		debug('Loaded Inject');
		window.addEventListener('message', function (event) {
			if (event.data && event.data.requestComments) {
				clearTimeout(commentsTimeout);
				getComments(0);
			}
			if (event.data && event.data.seekTo >= 0) {
				var player = document.getElementById('movie_player');
				if (player) {
					player.seekTo(event.data.seekTo);
				}
			}
		}, false);
	}
})();
