(function() {
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
	var maxRetryTimes = 80;
	var retryDelay = 200; // ms
	var video = null;
	var highlightsWrapper = null;
	var unpauseButton = null;

	// Levenshtein distance
	function similarity(s1, s2) {
		var longer = s1;
		var shorter = s2;

		if (s1.length < s2.length) {
			longer = s2;
			shorter = s1;
		}

		var longerLength = longer.length;

		if (longerLength == 0) {
			return 1.0;
		}

		return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
	}

	function editDistance(s1, s2) {
		var costs = [];

		s1 = s1.toLowerCase();
		s2 = s2.toLowerCase();

		for (var i = 0; i <= s1.length; i++) {
			var lastValue = i;

			for (var j = 0; j <= s2.length; j++) {
				if (i == 0) {
					costs[j] = j;
				} else {
					if (j > 0) {
						var newValue = costs[j - 1];

						if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
							newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
						}

						costs[j - 1] = lastValue;
						lastValue = newValue;
					}
				}
			}

			if (i > 0) {
				costs[s2.length] = lastValue;
			}
		}

		return costs[s2.length];
	}

	// Convert timestamp into seconds
	function convertTimestamp(timeStamp) {
		var timeFragments = timeStamp.split(':');
		var seconds = 0;
		var multiplier = 1;

		for (var i = 0; i < timeFragments.length; i++) {
			// Check if the timestamp has hours
			if (timeFragments.length === 3) {
				switch (i) {
					case 0:
						multiplier = 3600; // Hours
						break;
					case 1:
						multiplier = 60; // Minutes
						break;
					default:
						multiplier = 1; // Seconds
				}
			} else {
				switch (i) {
					case 0:
						multiplier = 60; // Minutes
						break;
					default:
						multiplier = 1; // Seconds
				}
			}

			seconds += parseInt(timeFragments[i]) * multiplier;
		}

		return seconds;
	}

	function generateTimestamp(timestamps, time, txt) {
		txt = txt.trim().replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
		var isHighlightReplaced = false;

		if (txt.length < 2) {
			return;
		}

		// Check if there is already timestamp
		if (timestamps[time]) {
			// Check existing highlights for this timestamp for similarity
			for (var j = 0; j < timestamps[time].highlights.length; j++) {
				if (similarity(timestamps[time].highlights[j], txt) > 0.8) {
					// Replace if the similarity is above the threshold
					timestamps[time].highlights[j] = txt;
					isHighlightReplaced = true;
				}
			}

			// Otherwise insert the highlight into the list
			if (!isHighlightReplaced) {
				timestamps[time].highlights.push(txt);
			}
		} else {
			timestamps[time] = {
				highlights: [txt],
				time: convertTimestamp(time)
			}
		}
	}

	function generateHighlights(resolve, count, comments) {
		var element = document.getElementById('description');

		if (element && comments.length) {
			var desc = element.textContent.split('\n');
			var timeRegex = /([0-9]?[0-9]:)?[0-5]?[0-9]:[0-5][0-9]/g;
			var timestamps = {};

			// Loop trough comments and add check for timestamps
			for (var c = 0; c < comments.length; c++) {
				var txt = comments[c].commentThreadRenderer.comment.commentRenderer.contentText;

				if (txt.runs) {
					var commentsBlob = txt.runs.map(function(e) { return e.text; }).join('');
					commentsBlob = commentsBlob.split('\n');

					for (var r = 0; r < commentsBlob.length; r++) {
						var timestamp = commentsBlob[r].match(timeRegex);

						if (timestamp) {
							generateTimestamp(timestamps, timestamp[0], commentsBlob[r].replace(timestamp[0], ''));
						}
					}
				}
			}

			// Loop trough all lines
			for (var i = 0; i < desc.length; i++) {
				var timestamp = desc[i].match(timeRegex);

				// If there is timestamp in the line extract it
				if (timestamp) {
					generateTimestamp(timestamps, timestamp[0], desc[i].replace(timestamp[0], ''));
				}
			}

			resolve(timestamps);
		} else if (count < maxRetryTimes) {
			setTimeout(function() {
				generateHighlights(resolve, ++count);
			}, retryDelay);
		}
	}

	function getVideoLength(resolve, count) {
		var element = document.querySelector('#ytd-player .ytp-time-duration');

		if (element) {
			resolve(convertTimestamp(element.textContent));
		} else if (count < maxRetryTimes) {
			setTimeout(function() {
				getVideoLength(resolve, ++count);
			}, retryDelay);
		}
	}

	function renderHighlights(videoLength, timestamps, count) {
		var progressBar = document.querySelector('#ytd-player .ytp-progress-bar-padding');

		if (progressBar) {
			var highlightsMarkup = '';

			highlightsWrapper = document.createElement('div');
			highlightsWrapper.setAttribute('id', 'ytph-wrapper');

			if (localStorage.getItem('ytph-highlights') === 'false') {
				highlightsWrapper.style.display = 'none';
			}

			for (var timestamp in timestamps) {
				if (timestamps.hasOwnProperty(timestamp)) {
					var highlights = timestamps[timestamp].highlights;
					var position = Math.max(0, ((timestamps[timestamp].time / videoLength) * 100) - 0.5); // Substract half ot the elem width and make sure its not bellow 0
					var tooltip = '<p>' + highlights.join('</p><p>').replace(/"/g, '&quot;') + '</p>';

					// TODO: Dont render more than X chars
					highlightsMarkup += '<div class="ytph-highlight" style="left: ' + position.toFixed(2) + '%;" data-tippy-content="' + tooltip + '"></div>';
				}
			}

			highlightsWrapper.innerHTML += highlightsMarkup;

			progressBar.appendChild(highlightsWrapper);

			// Init the tooltips
			tippy.setDefaults({
				animateFill: false,
				delay: [400, 0],
				duration: 0,
				maxWidth: '250px',
				theme: 'highlights'
			})

			tippy(document.querySelectorAll('.ytph-highlight'));
		} else if (count < maxRetryTimes) {
			setTimeout(function() {
				renderHighlights(videoLength, timestamps, ++count);
			}, retryDelay);
		}
	}

	function listenPlayerChange(count) {
		var player = document.querySelector('ytd-watch-flexy');

		if (player) {
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes') {
						getComments();
					}
				});
			});

			observer.observe(player, {
				attributes: true
			});
		} else if (count < 80) {
			setTimeout(function() {
				listenPlayerChange(++count);
			}, 200);
		}
	}

	function getComments() {
		var url = new URL(window.location.href);
		var v = url.searchParams.get('v');

		if (v && video !== v) {
			video = v;

			if (highlightsWrapper) {
				highlightsWrapper.parentNode.removeChild(highlightsWrapper);
			}

			window.postMessage({ requestComments: true }, '*');
		}
	}

	function setToggle(count) {
		var popup = document.querySelector('#ytd-player .ytp-popup .ytp-panel-menu');

		if (popup) {
			var menu = document.createElement('div');
			menu.innerHTML = '<div class="ytp-menuitem-label">Highlights</div><div class="ytp-menuitem-content"><div class="ytp-menuitem-toggle-checkbox"></div></div>';
			menu.setAttribute('class', 'ytp-menuitem');
			menu.setAttribute('role', 'menuitemcheckbox');
			menu.setAttribute('tabindex', '0');

			if (localStorage.getItem('ytph-highlights') !== 'false') {
				menu.setAttribute('aria-checked', 'true');
			}

			menu.addEventListener('click', function(e) {
				toggleHighlights(this);
			}, false);

			popup.insertBefore(menu, popup.firstChild);
		} else if (count < 80) {
			setTimeout(function() {
				setToggle(++count);
			}, 200);
		}
	}

	function toggleHighlights(toggle) {
		var value = toggle.getAttribute('aria-checked') === 'true' ? 'false' : 'true';

		toggle.setAttribute('aria-checked', value);
		localStorage.setItem('ytph-highlights', value);

		if (value === 'true') {
			highlightsWrapper.style.display = 'block';
		} else {
			highlightsWrapper.style.display = 'none';
		}
	}

	function listenPause() {
		setInterval(function() {
			unpauseButton = document.getElementById('confirm-button');

			if (unpauseButton && unpauseButton.offsetParent) {
				unpauseButton.click();
			}
		}, 1000);
	}

	window.onload = function() {
		// console.log('Loaded Content');

		window.addEventListener('message', function(event) {
			if (event.data && event.data.comments) {
				var timestampsPromise = new Promise(function(resolve) {
					generateHighlights(resolve, 0, event.data.comments);
				});

				var videoLengthPromise = new Promise(function(resolve) {
					getVideoLength(resolve, 0);
				});

				// When highlights are generated and video length extracted render it all
				Promise.all([videoLengthPromise, timestampsPromise]).then(function(values) {
					renderHighlights(values[0], values[1]);
				});
			}
		}, false);

		getComments();

		setToggle(0);

		listenPlayerChange(0);

		listenPause();
	}

	// Inject JS directly into the page in order to load the video comments and pass back the data for rendering
	var inject = document.createElement('script');
	inject.src = chrome.extension.getURL('inject.js');
	inject.onload = function() {
		this.remove();
	};

	(document.head || document.documentElement).appendChild(inject);
})();
