function InteractiveGraph (elem, initialSize) {
	var canvas = $(elem);
	var vBounds = null;
	var lastMousePoint = null;
	
	var makePt = function (x, y) { return { x: x, y: y }; };
	
	var deprojectPoint = function (p) {
		if (!vBounds) return null;
		return {
			x: (p.x * vBounds.width() / canvas.attr('width')) + vBounds.left,
			y: vBounds.height() * (1.0 - (p.y / canvas.attr('height'))) + vBounds.bottom
		};
	};
	
	var projectPoint = function (p) {
		if (!vBounds) return null;
		return {
			x: (p.x - vBounds.left) * canvas.attr('width') / vBounds.width(),
			y: canvas.attr('height') * (1.0 - (p.y - vBounds.bottom) / vBounds.height())
		};
	};

	var evaluatorProvider = null;
	this.evaluatorProvider = function(provider) {
		if (provider !== undefined) {
			evaluatorProvider = provider;
		}
	};
	
	var draw = function() {
		var context = canvas[0].getContext('2d');
		
		context.clearRect (0, 0, canvas.width(), canvas.height());
		
		// Grid lines
		context.strokeStyle = '#000000';
		context.lineWidth = 0.5;
		
		context.beginPath();
		
		var p = projectPoint (makePt (vBounds.left, 0));
		context.moveTo (p.x, p.y);
		
		p = projectPoint (makePt (vBounds.right, 0));
		context.lineTo (p.x, p.y);
		
		p = projectPoint (makePt (0, vBounds.top));
		context.moveTo (p.x, p.y);
		
		p = projectPoint (makePt (0, vBounds.bottom));
		context.lineTo (p.x, p.y);
		
		// Tick marks
		context.font = '18px "Trebuchet MS",Arial,Helvetica,sans-serif';
		context.fillStyle = '#000000';
		var halfLength = 3;
		var intervalY = Math.ceil (vBounds.height() / 20);
		var intervalX = Math.ceil (vBounds.width() / 20);
		
		var maxTickY = Math.floor (vBounds.top / intervalY);
		var minTickY = Math.ceil (vBounds.bottom / intervalY);
			
		if (maxTickY == 0) maxTickY = -1;
		if (minTickY == 0) minTickY = 1;
	
		var maxTickX = Math.floor (vBounds.right / intervalX);
		var minTickX = Math.ceil (vBounds.left / intervalX);
		
		if (maxTickX == 0) maxTickX = -1;
		if (minTickX == 0) minTickX = 1;
		
		for (var i = minTickY; i <= maxTickY; i++) {
			if (i == 0) continue;
			
			var y = i * intervalY;
			p = projectPoint (makePt (0, y));
			if (p.x < 0) p.x = 0;
			if (p.x > canvas.width()) p.x = canvas.width();
			
			context.moveTo (p.x - halfLength, p.y);
			context.lineTo (p.x + halfLength, p.y);
			
			if (i == maxTickY) {
				context.fillText (y, p.x + halfLength + 1, Math.max (18, p.y + 4));
			}
			
			if (i == minTickY) {
				context.fillText (y, p.x + halfLength + 1, Math.min (canvas.height(), p.y + 4));
			}
		}
		
		for (var i = minTickX; i <= maxTickX; i++) {
			if (i == 0) continue;
			
			var x = i * intervalX;
			p = projectPoint (makePt (x, 0));
			if (p.y < 0) p.y = 0;
			if (p.y > canvas.height()) p.y = canvas.height();
			
			context.moveTo (p.x, p.y - halfLength);
			context.lineTo (p.x, p.y + halfLength);
			
			if (i == maxTickX) {
				context.fillText (x, Math.min (p.x, canvas.width() - 24), p.y - halfLength - 1);
			}
			
			if (i == minTickX) {
				context.fillText (x, p.x, p.y - halfLength - 1);
			}
		}
		
		context.stroke();
		context.closePath();
		
		if (!evaluatorProvider) return;
		var evaluator = evaluatorProvider();

		if (!evaluator) return;
		
		// Graph itself
		context.strokeStyle = '#0000ff';
		context.lineWidth = 1.0;
		context.beginPath();
		
		var canvasWidth = canvas.attr ('width');
		for (var i = 0 ; i < canvasWidth; i++) {
			var vp = deprojectPoint (makePt (i, 0));
			vp.y = evaluator(vp.x);
			if (vp.y === null) {
				break;
			}
			
			var sp = projectPoint (vp);
			if (i == 0) {
				context.moveTo (sp.x, sp.y);
			} else {
				context.lineTo (sp.x, sp.y);
			}
		}
		
		context.stroke();
		context.closePath();
		
		// Hover Location
		if (lastMousePoint) {
			var vMousePt = deprojectPoint (lastMousePoint);
			var vGraphPt = vMousePt;
			try {
				vGraphPt.y = evaluator (vMousePt.x);
				if (vGraphPt.y === null || isNaN(vGraphPt.y)) return;
			} catch (e) {
				return;
			}
			
			var sGraphPt = projectPoint (vGraphPt);
			
			var crosshairSize = 10;

			context.strokeStyle = '#ff0000';
			context.lineWidth = 0.5;
			context.beginPath();
			context.moveTo (sGraphPt.x - crosshairSize, sGraphPt.y);
			context.lineTo (sGraphPt.x + crosshairSize, sGraphPt.y);
			context.moveTo (sGraphPt.x, 0);
			context.lineTo (sGraphPt.x, canvas.height());
			context.stroke();
			context.closePath();
			
			context.font = '14px "Trebuchet MS",Arial,Helvetica,sans-serif';
			context.fillStyle = '#ff0000';
			context.fillText ('y = ' + vGraphPt.y, lastMousePoint.x + 5, lastMousePoint.y - 10);
		}
	};

	this.redraw = function() {
		draw();
	}

	var setBounds = function (top, bottom, left, right) {
		vBounds = {
			top: top,
			bottom: bottom,
			left: left,
			right: right,
			width: function() { return this.right - this.left; },
			height: function() { return this.top - this.bottom; }
		};
	};
	
	$(window).resize (function (e) {
		var w = canvas.width();
		var h = canvas.height();
		var aspect = w / h;
		
		// virtual
		var portalSize = (vBounds) ? Math.min (vBounds.width(), vBounds.height()) : initialSize;
		var centerX = 0;
		var centerY = 0;
		if (vBounds) {
			centerX = (vBounds.left + vBounds.right) / 2;
			centerY = (vBounds.top + vBounds.bottom) / 2;
		}
		var vw = (w < h) ? portalSize : (portalSize * aspect);
		var vh = (h < w) ? portalSize : (portalSize / aspect);
		setBounds (centerY + vh / 2, centerY - vh / 2, centerX - vw / 2, centerX + vw / 2);
		
		canvas.attr ('width', canvas.width());
		canvas.attr ('height', canvas.height());
		draw();
	});
	$(window).resize();
	
	this.resetView = function() {
		vBounds = null;
		$(window).resize();
	};
	
	canvas.mousemove (function (e) {
		lastMousePoint = makePt (e.offsetX, e.offsetY);
		draw();
	});
	
	canvas.mouseleave (function (e) {
		lastMousePoint = null;
		draw();
	});
	
	canvas.mousedown (function (e) {
		e.preventDefault();
		
		var downX = e.pageX;
		var downY = e.pageY;
		
		var widthRatio = canvas.width() / vBounds.width();
		var heightRatio = canvas.height() / vBounds.height();
		
		var downBounds = vBounds;
		
		var defaultCursor = $(this).css ('cursor');
		$(this).css ('cursor', 'move');
		var finish = function() {
			canvas.unbind('mousemove.drag');
			canvas.css ('cursor', defaultCursor);
		};
		
		$('*').bind ('mouseup.drag', function(e) {
			$('*').unbind ('mouseup.drag');
			finish();
		});
		
		canvas.bind ('mousemove.drag', function (e) {
			// Drag
			if (e.pageX && e.pageY) {
				vOffX = (downX - e.pageX) / widthRatio;
				vOffY = (e.pageY - downY) / heightRatio;
				setBounds (
					downBounds.top + vOffY,
					downBounds.bottom + vOffY,
					downBounds.left + vOffX,
					downBounds.right + vOffX);
			}
			draw();
		}).mousemove();
	});

	canvas.mousewheel (function (e, delta) {
		if (delta == 0) {
			return;
		}

		var base = 0.8;
		var factor = Math.pow(base, delta);

		var newWidth = vBounds.width() * factor;
		var newHeight = vBounds.height() * factor;

		var pivot = lastMousePoint ? deprojectPoint(lastMousePoint) : null;
		if (!pivot) {
			// Mouse wheel without a hover position? Seems weird, but what the heck.
			var x = (vBounds.left + vBounds.right) / 2;
			var y = (vBounds.top + vBounds.bottom) / 2;
			pivot = makePt(x, y);
		}

		// We want the zoom operation to "pivot" at the desired point.
		var newLeft = pivot.x - newWidth * (pivot.x - vBounds.left) / vBounds.width();
		var newBottom = pivot.y - newHeight * (pivot.y - vBounds.bottom) / vBounds.height();

		var newRight = newLeft + newWidth;
		var newTop = newBottom + newHeight;

		setBounds (
			newTop,
			newBottom,
			newLeft,
			newRight
		);
		draw();
	});
}