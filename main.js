/**
 * This is the main kiwi script.
 * 
 * It assumes that all of the rangy files have been declared before this file.
 */

goog.require("goog.dom");

function Storage() {
}

Storage.prototype.store = function(serialized) {
    var payload = {
      threads: [{
        id: 1,
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
      }],
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
    
    highlighter.addClassApplier(rangy.createCssClassApplier("highlight", {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"],
         elementProperties: {
            href: "#",
            onclick: function(e) {
                var highlight = highlighter.getHighlightForElement(this);
                alert("Opening comment:" + highlight.id);
                // alert(e);
                return false;
            }
        }
    }));

    storage.load(function(serialized) {
        highlighter.deserialize(serialized.highlights);

        for (var t in serialized.threads) {
	    var html = "";
	    html += "<div class='thread'>";
	    html += "  <div class='caption'>";
	    html += "  <div class='header'>";
	    html += "    <span class='username'>";
	    html +=      serialized.threads[t].author.username;
	    html += "    </span>";
	    html += "    <span class='date'>";
	    html +=      serialized.threads[t].date;
	    html += "    </span>";
	    html += "  </div>";
	    html += serialized.threads[t].caption;
	    html += "  </div>";
	    html += "  <div class='comments'>";
            for (var c in serialized.threads[t].comments) {
		var comment = serialized.threads[t].comments[c];
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
	    html += "  <div class='form'>";
	    html += "    <form method='post'>";
	    html += "      <textarea name='comment' placeholder='Reply'>";
            html += "</textarea>";
	    html += "      <input type='submit' value='create'>";
	    html += "    </form>"
	    html += "  </div>"
	    html += "</div>"

	    var el = goog.dom.createElement("div");
	    el.className = "kiwi";
	    el.innerHTML = html;
	    document.body.appendChild(el);
        }
    });
};

window.onmouseup = function(e) {
    if (window.getSelection().type == "Caret") {
      return;
    }
    // console.log(window.getSelection().type == );
    highlighter.highlightSelection("highlight", {
      exclusive: false
    });
    // TODO(goto): there is probably an API in rangy for this.
    if (window.getSelection) {
	window.getSelection().removeAllRanges();
    } else if (document.selection) {
	document.selection.empty();
    }

    storage.store(highlighter.serialize());
}

