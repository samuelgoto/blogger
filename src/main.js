/**
 * This is the main rfc script.
 *
 * It assumes that all of the rangy files have been declared before this file.
 */
goog.provide("rfc");

goog.require("goog.dom");
goog.require("goog.dom.classes");
goog.require("goog.style");

goog.require("rfc.Storage");

var storage = new rfc.Storage();
var highlighter;

function init() {
    rangy.init();

    highlighter = rangy.createHighlighter();
    highlighter.threads = highlighter.threads || {};

    highlighter.addClassApplier(rangy.createCssClassApplier("rfc-highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"],
        elementAttributes: {
	    foo: "bar"
        },
	onElementCreate: function(el) {
	    // Unfortunately, this callback is called before the setup
	    // for getHighlightForElement can work, so we'll allow the thread
	    // to finish and only add the nodes once the setup is done.
	    setTimeout(function() {
		var highlight = highlighter.getHighlightForElement(el);

		var thread = document.body.querySelector(
		    ".rfc-thread[data-thread-id = '" + highlight.id + "']");

		// If a thread was already created, skip.
		if (thread) {
		    return;
		}

		storage.get("/threads/" + highlight.id, function(s, thread) {
		    var className = "";
		    var id = highlight.id;
		    if (s == 404) {
			// This is a new thread.
			thread = {
			    date: (new Date()).toString(),
			    author: {
				username: "Sam Goto"
			    }
			};
			className += "rfc-thread-new";
		    }

		    var offsetTop = goog.style.getPageOffsetTop(el);
		    var html = createThread(id, thread);

		    var container = goog.dom.createElement("div");
		    container.onclick = function(e) {
			this.setAttribute("data-rfc-focus", "true");
		    };
		    container.className = "rfc-thread";
		    container.innerHTML = html;
		    container.setAttribute("data-thread-id", id);
		    container.className = container.className + " " + className;
		    document.body.querySelector(".rfc").appendChild(container);

		    // Positions the thread at the right level.
		    var offsetTop = goog.style.getPageOffsetTop(el);
		    container.style.top = offsetTop + "px";

		    // Pushes threads one above the other.
		    var threads = document.body.querySelectorAll(
			".rfc-thread[data-thread-offset-top = '" + 
			    offsetTop + "']")
		    var zIndex = 100;
		    for (var t = 0; t < threads.length; t++) {
			var z = Number(threads[t].getAttribute(
			    "data-thread-z-index"));
			if (z >= zIndex) {
			    zIndex = z + 1;
			}
		    }
		    // TODO(goto): set a max z-index here.

		    container.setAttribute("data-thread-offset-top", offsetTop);
		    container.setAttribute("data-thread-z-index", zIndex);

		    container.style.zIndex = zIndex;
		});
	    }, 0);
        },
        elementProperties: {
            href: "#",
            onclick: function(e) {
		var highlight = highlighter.getHighlightForElement(this);

		var thread = document.body.querySelector(
		    ".rfc-thread[data-thread-id = '" + highlight.id + "']");

		thread.setAttribute("data-rfc-focus", "true");

                return false;
            }
        }
    }));

    var container = goog.dom.createElement("div");
    container.className = "rfc";
    document.body.appendChild(container);

    storage.load(function(serialized) {
	storage.get("/highlights", function(status, highlights) {
	    if (status == 200) {
		highlighter.deserialize(highlights);
	    }
	});
    });
};

function scrollThread(el) {
    var highlight = highlighter.getHighlightForElement(el);

    var thread = document.body.querySelector(
	".rfc-thread[data-thread-id = '" + highlight.id + "']");

    var offsetTop = goog.style.getPageOffsetTop(el);

    thread.style.top = offsetTop + "px";
}

function onCreateThread(input) {
    var caption = input["caption"].value;

    var p = walkUp(input, "rfc-thread");

    var id = p.getAttribute("data-thread-id");

    var thread = {
	caption: caption,
	date: (new Date()).toString(),
	author: {
	    username: "Sam Goto"
	}
    };

    storeThread(id, thread, function() {
	goog.dom.classes.remove(p, "rfc-thread-new");

	var el = p.querySelector(".rfc-caption .rfc-content");
	el.innerHTML = caption;
    });

    return false;
}

function storeThread(id, thread, callback) {
    // console.log(thread);
    storage.post("/threads/" + id, thread, function() {
	var highlights = highlighter.serialize();
	storage.post("/highlights", highlights, function() {
	    callback();
        });
    });
}

function walkUp(el, clazz) {
    var p = el.parentNode;
    
    while (p !== null) {
	if (goog.dom.classes.has(p, clazz)) {
	    // break;
	    return p;
	}
        p = p.parentNode;
    }
}

function onCancelThread(input) {
    var p = walkUp(input, "rfc-thread");

    var id = p.getAttribute("data-thread-id");

    // Removes the highlight from the highlighter.
    for (var h in highlighter.highlights) {
	if (highlighter.highlights[h].id == id) {
	    highlighter.removeHighlights([highlighter.highlights[h]]);
	}
    }

    // Removes the nodes from the dom.
    goog.dom.removeNode(p);

    return false;
}

function onCreateComment(input) {
    var caption = input["comment"].value;
    var p = walkUp(input, "rfc-thread");
    var id = p.getAttribute("data-thread-id");
    storage.get("/threads/" + id, function(status, payload) {
	payload.comments = payload.comments || [];
	var comment = {
	    date: (new Date()).toString(),
	    caption: caption,
	    author: {
		username: "Sam Goto"
	    }
	};
	payload.comments.push(comment);
	storage.post("/threads/" + id, payload, function(payload) {
	    // Appends the comment element.
	    var container = p.querySelector(".rfc-comments");
	    var el = goog.dom.createElement("div");
	    el.className = "rfc-comment";
	    el.innerHTML = createComment(comment);
	    container.appendChild(el);

	    // Updates the UI, closes the comment box.
	    input["comment"].value = "";
	});
    });
    return false;
}

function onCancelComment(input) {
    input.form["comment"].value = "";
    return false;
}

function createComment(comment) {
    var html = "";
    html += "<div class='rfc-header'>";
    html += "  <span class='rfc-username'>";
    html +=    comment.author.username;
    html += " </span>";
    html += "  <span class='rfc-date'>";
    html +=    comment.date;
    html += "  </span>";
    html += "</div>";
    html += "<div class='rfc-content'>";
    html +=   comment.caption;
    html += "</div>";
    return html;
}

function createThread(id, thread) {
    var html = "";
    html += "  <div class='rfc-caption'>";
    html += "    <div class='rfc-header'>";
    html += "      <span class='rfc-username'>";
    html +=        thread.author.username;
    html += "      </span>";
    html += "      <span class='rfc-date'>";
    html +=        thread.date;
    html += "      </span>";
    html += "    </div>";
    html += "    <div class='rfc-content'>";
    if (thread.caption) {
	html += thread.caption;
    }
    html += "    </div>";
    html += "  </div>";
    html += "  <div class='rfc-thread-body'>";
    html += "    <div class='rfc-comments'>";
    for (var c in thread.comments) {
	var comment = thread.comments[c];
	html += "  <div class='rfc-comment'>";
	html +=     createComment(comment);
	html += "  </div>"
    }
    html += "    </div>"
    html += "    <div class='rfc-create-form'>";
    html += "      <form name='create-form' onsubmit='return onCreateThread(this);'>";
    html += "        <textarea required name='caption' autofocus placeholder='Add a comment'>";
    html += "</textarea>";
    html += "        <input type='submit' value='create'>";
    html += "        <input type='submit' value='cancel' onclick='return onCancelThread(this);'>";
    html += "      </form>"
    html += "    </div>"
    html += "    <div class='rfc-comment-form'>";
    html += "      <form name='rfc-comment-form' onsubmit='return onCreateComment(this);'>";
    html += "        <textarea required name='comment' placeholder='Reply'>";
    html += "</textarea>";
    html += "        <input type='submit' value='create'>";
    html += "        <input type='submit' value='cancel' onclick='return onCancelComment(this);'>";
    html += "      </form>"
    html += "    </div>"
    html += "  </div>"
    
    return html;
}

function threadBlur(thread) {
    // Cleaning any focus that may exist.
    thread.setAttribute("data-rfc-focus", false);

    var offsetTop = thread.getAttribute("data-thread-offset-top");
    var threads = document.querySelectorAll(
	".rfc-thread[data-thread-offset-top='" + offsetTop + "']");

    // Re-organizes the threads.
    for (var t = 0; t < threads.length; t++) {
	if (thread == threads[t]) {
	    // Pushes the current thread to the bottom.
	    thread.setAttribute("data-thread-z-index", 100);
	    thread.style.zIndex = 100;
	} else {
	    // Pushes all the other threads up.
	    var zIndex = Number(threads[t].getAttribute("data-thread-z-index"));
	    zIndex++;
	    threads[t].setAttribute("data-thread-z-index", zIndex)
	    threads[t].style.zIndex = zIndex;
	}
    }
}

window.onmouseup = function(e) {
    var thread = document.querySelector(".rfc-thread[data-rfc-focus=true]");
    if (thread) {
	// Cleaning any focus that may exist.
	// thread.setAttribute("data-rfc-focus", false);
	threadBlur(thread);
    }

    if (window.getSelection().type == "Caret") {
      return;
    }

    // If a selection is made a thread, ignore it.
    var p = walkUp(e.target, "rfc-thread");
    if (p) {
	return;
    }

    highlighter.highlightSelection("rfc-highlight", {
      exclusive: false
    });
}

window.addEventListener("load", init, false);
