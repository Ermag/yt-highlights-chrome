(function () {
	var isLoadDispatched = false;
	var retryCount = 100;
	
	readyComments = function (data) {
		// console.log('Ready Comments');
		window.postMessage({ comments: data }, '*');
	}

	getComments = function (count) {
		// console.log('Get comments', count);
		var comments = document.querySelector('ytd-comments#comments');

		if (!isLoadDispatched && comments && comments.$) {
			comments.setAttribute('style', 'position: absolute; top: 0; z-index: -999;');
			window.dispatchEvent(new Event('scroll'));
			isLoadDispatched = true;
			// Failsafe
			setTimeout(function () {
				comments.removeAttribute('style');
			}, 5000);
		}

		if (comments && comments.$ && comments.$.sections && comments.$.sections.items_.length > 1) {
			comments.removeAttribute('style');
			readyComments(comments.$.sections.items_);
		} else if (count < retryCount) {
			setTimeout(function () {
				getComments(++count);
			}, 200);
		}
	}

	window.onload = function () {
		// console.log('Loaded Inject');
		window.addEventListener('message', function (event) {
			if (event.data && event.data.requestComments) {
				getComments(0);
			}
		}, false);
	}
})();
