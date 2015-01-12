/**
 * This is the main kiwi script.
 * 
 * It assumes that all of the rangy files have been declared before this file.
 */

goog.require("goog.dom");
goog.require("goog.dom.classes");
goog.require("goog.style");

function Storage() {
}

Storage.prototype.store = function(serialized) {
    var payload = {
      threads: {
        "1" : {
            caption: "Hello World!",
            date: "8:00am 10/10/14",
            author: {
		username: "Sam Goto"
            },
            comments: [{
		date: "9:25am Today",
		author:  {
		    username: "John Doe"
		},
		caption: "This is a comment from a user"
            }, {
		date: "10:40am Today",
		author: {
		    username: "Bob Marley"
		},
		caption: "This is another comment from another user"
            }]
	}
      },
      highlights: serialized
    };

    window.location.hash = "highlights=" + encodeURIComponent(
        JSON.stringify(payload));
}

Storage.prototype.load = function(callback) {
   var serialized = decodeURIComponent(
	window.location.hash.slice(window.location.hash.indexOf("=") + 1));
   if (serialized) {
     callback(JSON.parse(serialized));
   }
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
		var thread = highlighter.threads[highlight.id];

		var className = "";
		if (!thread) {
		    // This is a new thread.
		    thread = {
			id: highlight.id,
			date: new Date(),
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
        // Add the threads to the highligher global object.
	highlighter.threads = serialized.threads;
        highlighter.deserialize(serialized.highlights);
    });
};

function onCreateThread(form) {
    // alert("creating a thread");
    var caption = document.forms["create-form"]["caption"].value;
    console.log(caption);
    return false;
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



function onCreateComment(form) {
    console.log("creating a comment");
    return false;
}

function createThread(thread) {
    var html = "";
    html += "  <div class='caption'>";
    html += "  <div class='header'>";
    html += "    <span class='username'>";
    html +=      thread.author.username;
    html += "    </span>";
    html += "    <span class='date'>";
    html +=      thread.date;
    html += "    </span>";
    html += "  </div>";
    if (thread.caption) {
	html += thread.caption;
    }
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
	html +=      comment.caption;
	html += "    </div>"
    }
    html += "  </div>"
    html += "  <div class='create-form'>";
    html += "    <form name='create-form' onsubmit='return onCreateThread();'>";
    html += "      <textarea required name='caption' autofocus placeholder='Add a comment'>";
    html += "</textarea>";
    html += "      <input type='submit' value='create'>";
    html += "      <input type='submit' value='cancel' onclick='return onCancelThread(this);'>";
    html += "    </form>"
    html += "  </div>"
    html += "  <div class='comment-form'>";
    html += "    <form name='comment-form' onsubmit='return onCreateComment();'>";
    html += "      <textarea required name='comment' autofocus placeholder='Reply'>";
    html += "</textarea>";
    html += "      <input type='submit' value='create'>";
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
    // TODO(goto): there is probably an API in rangy for this.
    //if (window.getSelection) {
    //window.getSelection().removeAllRanges();
    //} else if (document.selection) {
    //document.selection.empty();
    //}

    // storage.store(highlighter.serialize());
}

