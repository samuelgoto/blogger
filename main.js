/**
 * This is the main kiwi script.
 * 
 * It assumes that all of the rangy files have been declared before this file.
 */

goog.require("goog.dom");
goog.require("goog.dom.classes");
goog.require("goog.style");

function Storage() {
    this.cache_ = {};
}

Storage.prototype.load = function(callback) {
    var blob = decodeURIComponent(
	window.location.hash.slice(window.location.hash.indexOf("=") + 1));
    if (blob) {
	this.cache_ = JSON.parse(blob);
    }
    callback();
}

Storage.prototype.get = function(path, callback) {
    if (this.cache_[path]) {
	callback(200, this.cache_[path]);
	return;
    }
    callback(404);
}

Storage.prototype.commit_ = function() {
    window.location.hash = "highlights=" + encodeURIComponent(
        JSON.stringify(this.cache_));
}

Storage.prototype.post = function(path, payload, callback) {
    this.cache_[path] = payload;
    this.commit_();
    callback(200, payload);
}

var storage = new Storage();
var highlighter;

window.onload = function() {
    rangy.init();
    
    highlighter = rangy.createHighlighter();
    highlighter.threads = highlighter.threads || {};
    
    highlighter.addClassApplier(rangy.createCssClassApplier("highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"],
        elementAttributes: {
	    foo: "bar",
        },
	onElementCreate: function(el) {
	    // Unfortunately, this callback is called before the setup
	    // for getHighlightForElement can work, so we'll allow the thread
	    // to finish and only add the nodes once the setup is done.
	    setTimeout(function() {
		var highlight = highlighter.getHighlightForElement(el);
		// var thread = highlighter.threads[highlight.id];
		storage.get("/threads/" + highlight.id, function(s, thread) {
		    var className = "";
		    if (s == 404) {
			// This is a new thread.
			thread = {
			    id: highlight.id,
			    date: (new Date()).toString(),
			    author: {
				username: "Sam Goto"
			    }
			};
			className += "thread-new";
		    }
		    // console.log(thread);
		    
		    var offsetTop = goog.style.getPageOffsetTop(el);
		    // console.log(offsetTop);
		    var container = createThread(thread);
		    container.style.top = offsetTop + "px";
		    container.className = container.className + " " + className;
		    document.body.appendChild(container);
		});
	    }, 0);
        },
        elementProperties: {
            href: "#",
            onclick: function(e) {
                var highlight = highlighter.getHighlightForElement(this);
                alert("Opening comment:" + highlight.id);
                return false;
            },
        }
    }));

    storage.load(function(serialized) {
	storage.get("/highlights", function(status, highlights) {
	    if (status == 200) {
		highlighter.deserialize(highlights);
	    }
	});
    });
};

function onCreateThread(input) {
    var caption = document.forms["create-form"]["caption"].value;

    var p = input.parentNode;
    while (p !== null) {
	if (goog.dom.classes.has(p, "thread")) {
	    break;
	}
        p = p.parentNode;
    }

    var id = p.getAttribute("data-thread-id");

    var thread = {
	caption: caption,
	date: (new Date()).toString(),
	author: {
	    username: "Sam Goto"
	}
    };

    storeThread(id, thread, function() {
	goog.dom.classes.remove(p, "thread-new");

	var el = p.querySelector(".caption .content");
	el.innerHTML = caption;
    });

    return false;
}

function storeThread(id, thread, callback) {
    console.log(thread);
    storage.post("/threads/" + id, thread, function() {
	var highlights = highlighter.serialize();
	storage.post("/highlights", highlights, function() {
	    callback();
        });
    });
}

function onCancelThread(input) {
    var p = input.parentNode;
    
    while (p !== null) {
	if (goog.dom.classes.has(p, "thread")) {
	    break;
	}
        p = p.parentNode;
    }

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
    return false;
}

function onCancelComment(input) {
    input.form["comment"].value = "";
    return false;
}

function createThread(thread) {
    var html = "";
    html += "  <div class='caption'>";
    html += "    <div class='header'>";
    html += "      <span class='username'>";
    html +=        thread.author.username;
    html += "      </span>";
    html += "      <span class='date'>";
    html +=        thread.date;
    html += "      </span>";
    html += "    </div>";
    html += "    <div class='content'>";
    if (thread.caption) {
	html += thread.caption;
    }
    html += "    </div>";
    html += "  </div>";
    html += "  <div class='comments'>";
    for (var c in thread.comments) {
	var comment = thread.comments[c];
	html += "    <div class='comment'>";
   	html += "      <div class='header'>";
   	html += "        <span class='username'>";
	html +=          comment.author.username;
	html += "        </span>";
	html += "        <span class='date'>";
	html +=          comment.date;
	html += "        </span>";
 	html += "      </div>";
   	html += "      <div class='content'>";
	html +=          comment.caption;
 	html += "      </div>";
	html += "    </div>"
    }
    html += "  </div>"
    html += "  <div class='create-form'>";
    html += "    <form name='create-form' onsubmit='return onCreateThread(this);'>";
    html += "      <textarea required name='caption' autofocus placeholder='Add a comment'>";
    html += "</textarea>";
    html += "      <input type='submit' value='create'>";
    html += "      <input type='submit' value='cancel' onclick='return onCancelThread(this);'>";
    html += "    </form>"
    html += "  </div>"
    html += "  <div class='comment-form'>";
    html += "    <form name='comment-form' onsubmit='return onCreateComment();'>";
    html += "      <textarea required name='comment' placeholder='Reply'>";
    html += "</textarea>";
    html += "      <input type='submit' value='create'>";
    html += "      <input type='submit' value='cancel' onclick='return onCancelComment(this);'>";
    html += "    </form>"
    html += "  </div>"
    
    var el = goog.dom.createElement("div");
    el.className = "thread";
    el.innerHTML = html;
    el.setAttribute("data-thread-id", thread.id);
    return el;
}

window.onmouseup = function(e) {
    if (window.getSelection().type == "Caret") {
      return;
    }
    highlighter.highlightSelection("highlight", {
      exclusive: false
    });
}

