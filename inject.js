(function () {
	readyComments = function (count) {
		var watch = document.querySelector('ytd-watch-flexy');

		if (watch && watch.comments && watch.comments.contents) {
			// console.log('Ready Comments');
			window.postMessage({ comments: watch.comments.contents }, '*');
		} else if (count < 100) {
			setTimeout(function () {
				readyComments(++count);
			}, 200);
		}
	}

	getComments = function (count) {
		// console.log('Get comments');
		var comments = document.querySelector('ytd-comments');
		var watch = document.querySelector('ytd-watch-flexy');

		if (comments && comments.$ && typeof comments.loadComments === 'function' && watch && watch.comments && !watch.comments.contents) {
			comments.loadComments();
		}

		if (watch && watch.comments && watch.comments.contents) {
			if (watch.comments.trackingParams) {
				readyComments(0);
			} else {
				setTimeout(function () {
					getComments(0);
				}, 200);
			}
		} else if (count < 100) {
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
