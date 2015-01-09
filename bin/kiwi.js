(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory();
    } else {
      root.rangy = factory();
    }
  }
})(function() {
  var OBJECT = "object", FUNCTION = "function", UNDEFINED = "undefined";
  var domRangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed", "commonAncestorContainer"];
  var domRangeMethods = ["setStart", "setStartBefore", "setStartAfter", "setEnd", "setEndBefore", "setEndAfter", "collapse", "selectNode", "selectNodeContents", "compareBoundaryPoints", "deleteContents", "extractContents", "cloneContents", "insertNode", "surroundContents", "cloneRange", "toString", "detach"];
  var textRangeProperties = ["boundingHeight", "boundingLeft", "boundingTop", "boundingWidth", "htmlText", "text"];
  var textRangeMethods = ["collapse", "compareEndPoints", "duplicate", "moveToElementText", "parentElement", "select", "setEndPoint", "getBoundingClientRect"];
  function isHostMethod(o, p) {
    var t = typeof o[p];
    return t == FUNCTION || !!(t == OBJECT && o[p]) || t == "unknown";
  }
  function isHostObject(o, p) {
    return!!(typeof o[p] == OBJECT && o[p]);
  }
  function isHostProperty(o, p) {
    return typeof o[p] != UNDEFINED;
  }
  function createMultiplePropertyTest(testFunc) {
    return function(o, props) {
      var i = props.length;
      while (i--) {
        if (!testFunc(o, props[i])) {
          return false;
        }
      }
      return true;
    };
  }
  var areHostMethods = createMultiplePropertyTest(isHostMethod);
  var areHostObjects = createMultiplePropertyTest(isHostObject);
  var areHostProperties = createMultiplePropertyTest(isHostProperty);
  function isTextRange(range) {
    return range && areHostMethods(range, textRangeMethods) && areHostProperties(range, textRangeProperties);
  }
  function getBody(doc) {
    return isHostObject(doc, "body") ? doc.body : doc.getElementsByTagName("body")[0];
  }
  var modules = {};
  var isBrowser = typeof window != UNDEFINED && typeof document != UNDEFINED;
  var util = {isHostMethod:isHostMethod, isHostObject:isHostObject, isHostProperty:isHostProperty, areHostMethods:areHostMethods, areHostObjects:areHostObjects, areHostProperties:areHostProperties, isTextRange:isTextRange, getBody:getBody};
  var api = {version:"1.3.0-alpha.20140921", initialized:false, isBrowser:isBrowser, supported:true, util:util, features:{}, modules:modules, config:{alertOnFail:true, alertOnWarn:false, preferTextRange:false, autoInitialize:typeof rangyAutoInitialize == UNDEFINED ? true : rangyAutoInitialize}};
  function consoleLog(msg) {
    if (typeof console != UNDEFINED && isHostMethod(console, "log")) {
      console.log(msg);
    }
  }
  function alertOrLog(msg, shouldAlert) {
    if (isBrowser && shouldAlert) {
      alert(msg);
    } else {
      consoleLog(msg);
    }
  }
  function fail(reason) {
    api.initialized = true;
    api.supported = false;
    alertOrLog("Rangy is not supported in this environment. Reason: " + reason, api.config.alertOnFail);
  }
  api.fail = fail;
  function warn(msg) {
    alertOrLog("Rangy warning: " + msg, api.config.alertOnWarn);
  }
  api.warn = warn;
  var extend;
  if ({}.hasOwnProperty) {
    util.extend = extend = function(obj, props, deep) {
      var o, p;
      for (var i in props) {
        if (props.hasOwnProperty(i)) {
          o = obj[i];
          p = props[i];
          if (deep && o !== null && typeof o == "object" && p !== null && typeof p == "object") {
            extend(o, p, true);
          }
          obj[i] = p;
        }
      }
      if (props.hasOwnProperty("toString")) {
        obj.toString = props.toString;
      }
      return obj;
    };
    util.createOptions = function(optionsParam, defaults) {
      var options = {};
      extend(options, defaults);
      if (optionsParam) {
        extend(options, optionsParam);
      }
      return options;
    };
  } else {
    fail("hasOwnProperty not supported");
  }
  if (!isBrowser) {
    fail("Rangy can only run in a browser");
  }
  (function() {
    var toArray;
    if (isBrowser) {
      var el = document.createElement("div");
      el.appendChild(document.createElement("span"));
      var slice = [].slice;
      try {
        if (slice.call(el.childNodes, 0)[0].nodeType == 1) {
          toArray = function(arrayLike) {
            return slice.call(arrayLike, 0);
          };
        }
      } catch (e) {
      }
    }
    if (!toArray) {
      toArray = function(arrayLike) {
        var arr = [];
        for (var i = 0, len = arrayLike.length;i < len;++i) {
          arr[i] = arrayLike[i];
        }
        return arr;
      };
    }
    util.toArray = toArray;
  })();
  var addListener;
  if (isBrowser) {
    if (isHostMethod(document, "addEventListener")) {
      addListener = function(obj, eventType, listener) {
        obj.addEventListener(eventType, listener, false);
      };
    } else {
      if (isHostMethod(document, "attachEvent")) {
        addListener = function(obj, eventType, listener) {
          obj.attachEvent("on" + eventType, listener);
        };
      } else {
        fail("Document does not have required addEventListener or attachEvent method");
      }
    }
    util.addListener = addListener;
  }
  var initListeners = [];
  function getErrorDesc(ex) {
    return ex.message || ex.description || String(ex);
  }
  function init() {
    if (!isBrowser || api.initialized) {
      return;
    }
    var testRange;
    var implementsDomRange = false, implementsTextRange = false;
    if (isHostMethod(document, "createRange")) {
      testRange = document.createRange();
      if (areHostMethods(testRange, domRangeMethods) && areHostProperties(testRange, domRangeProperties)) {
        implementsDomRange = true;
      }
    }
    var body = getBody(document);
    if (!body || body.nodeName.toLowerCase() != "body") {
      fail("No body element found");
      return;
    }
    if (body && isHostMethod(body, "createTextRange")) {
      testRange = body.createTextRange();
      if (isTextRange(testRange)) {
        implementsTextRange = true;
      }
    }
    if (!implementsDomRange && !implementsTextRange) {
      fail("Neither Range nor TextRange are available");
      return;
    }
    api.initialized = true;
    api.features = {implementsDomRange:implementsDomRange, implementsTextRange:implementsTextRange};
    var module, errorMessage;
    for (var moduleName in modules) {
      if ((module = modules[moduleName]) instanceof Module) {
        module.init(module, api);
      }
    }
    for (var i = 0, len = initListeners.length;i < len;++i) {
      try {
        initListeners[i](api);
      } catch (ex) {
        errorMessage = "Rangy init listener threw an exception. Continuing. Detail: " + getErrorDesc(ex);
        consoleLog(errorMessage);
      }
    }
  }
  api.init = init;
  api.addInitListener = function(listener) {
    if (api.initialized) {
      listener(api);
    } else {
      initListeners.push(listener);
    }
  };
  var shimListeners = [];
  api.addShimListener = function(listener) {
    shimListeners.push(listener);
  };
  function shim(win) {
    win = win || window;
    init();
    for (var i = 0, len = shimListeners.length;i < len;++i) {
      shimListeners[i](win);
    }
  }
  if (isBrowser) {
    api.shim = api.createMissingNativeApi = shim;
  }
  function Module(name, dependencies, initializer) {
    this.name = name;
    this.dependencies = dependencies;
    this.initialized = false;
    this.supported = false;
    this.initializer = initializer;
  }
  Module.prototype = {init:function() {
    var requiredModuleNames = this.dependencies || [];
    for (var i = 0, len = requiredModuleNames.length, requiredModule, moduleName;i < len;++i) {
      moduleName = requiredModuleNames[i];
      requiredModule = modules[moduleName];
      if (!requiredModule || !(requiredModule instanceof Module)) {
        throw new Error("required module '" + moduleName + "' not found");
      }
      requiredModule.init();
      if (!requiredModule.supported) {
        throw new Error("required module '" + moduleName + "' not supported");
      }
    }
    this.initializer(this);
  }, fail:function(reason) {
    this.initialized = true;
    this.supported = false;
    throw new Error("Module '" + this.name + "' failed to load: " + reason);
  }, warn:function(msg) {
    api.warn("Module " + this.name + ": " + msg);
  }, deprecationNotice:function(deprecated, replacement) {
    api.warn("DEPRECATED: " + deprecated + " in module " + this.name + "is deprecated. Please use " + replacement + " instead");
  }, createError:function(msg) {
    return new Error("Error in Rangy " + this.name + " module: " + msg);
  }};
  function createModule(name, dependencies, initFunc) {
    var newModule = new Module(name, dependencies, function(module) {
      if (!module.initialized) {
        module.initialized = true;
        try {
          initFunc(api, module);
          module.supported = true;
        } catch (ex) {
          var errorMessage = "Module '" + name + "' failed to load: " + getErrorDesc(ex);
          consoleLog(errorMessage);
          if (ex.stack) {
            consoleLog(ex.stack);
          }
        }
      }
    });
    modules[name] = newModule;
    return newModule;
  }
  api.createModule = function(name) {
    var initFunc, dependencies;
    if (arguments.length == 2) {
      initFunc = arguments[1];
      dependencies = [];
    } else {
      initFunc = arguments[2];
      dependencies = arguments[1];
    }
    var module = createModule(name, dependencies, initFunc);
    if (api.initialized && api.supported) {
      module.init();
    }
  };
  api.createCoreModule = function(name, dependencies, initFunc) {
    createModule(name, dependencies, initFunc);
  };
  function RangePrototype() {
  }
  api.RangePrototype = RangePrototype;
  api.rangePrototype = new RangePrototype;
  function SelectionPrototype() {
  }
  api.selectionPrototype = new SelectionPrototype;
  api.createCoreModule("DomUtil", [], function(api, module) {
    var UNDEF = "undefined";
    var util = api.util;
    if (!util.areHostMethods(document, ["createDocumentFragment", "createElement", "createTextNode"])) {
      module.fail("document missing a Node creation method");
    }
    if (!util.isHostMethod(document, "getElementsByTagName")) {
      module.fail("document missing getElementsByTagName method");
    }
    var el = document.createElement("div");
    if (!util.areHostMethods(el, ["insertBefore", "appendChild", "cloneNode"] || !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]))) {
      module.fail("Incomplete Element implementation");
    }
    if (!util.isHostProperty(el, "innerHTML")) {
      module.fail("Element is missing innerHTML property");
    }
    var textNode = document.createTextNode("test");
    if (!util.areHostMethods(textNode, ["splitText", "deleteData", "insertData", "appendData", "cloneNode"] || !util.areHostObjects(el, ["previousSibling", "nextSibling", "childNodes", "parentNode"]) || !util.areHostProperties(textNode, ["data"]))) {
      module.fail("Incomplete Text Node implementation");
    }
    var arrayContains = function(arr, val) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === val) {
          return true;
        }
      }
      return false;
    };
    function isHtmlNamespace(node) {
      var ns;
      return typeof node.namespaceURI == UNDEF || ((ns = node.namespaceURI) === null || ns == "http://www.w3.org/1999/xhtml");
    }
    function parentElement(node) {
      var parent = node.parentNode;
      return parent.nodeType == 1 ? parent : null;
    }
    function getNodeIndex(node) {
      var i = 0;
      while (node = node.previousSibling) {
        ++i;
      }
      return i;
    }
    function getNodeLength(node) {
      switch(node.nodeType) {
        case 7:
        ;
        case 10:
          return 0;
        case 3:
        ;
        case 8:
          return node.length;
        default:
          return node.childNodes.length;
      }
    }
    function getCommonAncestor(node1, node2) {
      var ancestors = [], n;
      for (n = node1;n;n = n.parentNode) {
        ancestors.push(n);
      }
      for (n = node2;n;n = n.parentNode) {
        if (arrayContains(ancestors, n)) {
          return n;
        }
      }
      return null;
    }
    function isAncestorOf(ancestor, descendant, selfIsAncestor) {
      var n = selfIsAncestor ? descendant : descendant.parentNode;
      while (n) {
        if (n === ancestor) {
          return true;
        } else {
          n = n.parentNode;
        }
      }
      return false;
    }
    function isOrIsAncestorOf(ancestor, descendant) {
      return isAncestorOf(ancestor, descendant, true);
    }
    function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
      var p, n = selfIsAncestor ? node : node.parentNode;
      while (n) {
        p = n.parentNode;
        if (p === ancestor) {
          return n;
        }
        n = p;
      }
      return null;
    }
    function isCharacterDataNode(node) {
      var t = node.nodeType;
      return t == 3 || t == 4 || t == 8;
    }
    function isTextOrCommentNode(node) {
      if (!node) {
        return false;
      }
      var t = node.nodeType;
      return t == 3 || t == 8;
    }
    function insertAfter(node, precedingNode) {
      var nextNode = precedingNode.nextSibling, parent = precedingNode.parentNode;
      if (nextNode) {
        parent.insertBefore(node, nextNode);
      } else {
        parent.appendChild(node);
      }
      return node;
    }
    function splitDataNode(node, index, positionsToPreserve) {
      var newNode = node.cloneNode(false);
      newNode.deleteData(0, index);
      node.deleteData(index, node.length - index);
      insertAfter(newNode, node);
      if (positionsToPreserve) {
        for (var i = 0, position;position = positionsToPreserve[i++];) {
          if (position.node == node && position.offset > index) {
            position.node = newNode;
            position.offset -= index;
          } else {
            if (position.node == node.parentNode && position.offset > getNodeIndex(node)) {
              ++position.offset;
            }
          }
        }
      }
      return newNode;
    }
    function getDocument(node) {
      if (node.nodeType == 9) {
        return node;
      } else {
        if (typeof node.ownerDocument != UNDEF) {
          return node.ownerDocument;
        } else {
          if (typeof node.document != UNDEF) {
            return node.document;
          } else {
            if (node.parentNode) {
              return getDocument(node.parentNode);
            } else {
              throw module.createError("getDocument: no document found for node");
            }
          }
        }
      }
    }
    function getWindow(node) {
      var doc = getDocument(node);
      if (typeof doc.defaultView != UNDEF) {
        return doc.defaultView;
      } else {
        if (typeof doc.parentWindow != UNDEF) {
          return doc.parentWindow;
        } else {
          throw module.createError("Cannot get a window object for node");
        }
      }
    }
    function getIframeDocument(iframeEl) {
      if (typeof iframeEl.contentDocument != UNDEF) {
        return iframeEl.contentDocument;
      } else {
        if (typeof iframeEl.contentWindow != UNDEF) {
          return iframeEl.contentWindow.document;
        } else {
          throw module.createError("getIframeDocument: No Document object found for iframe element");
        }
      }
    }
    function getIframeWindow(iframeEl) {
      if (typeof iframeEl.contentWindow != UNDEF) {
        return iframeEl.contentWindow;
      } else {
        if (typeof iframeEl.contentDocument != UNDEF) {
          return iframeEl.contentDocument.defaultView;
        } else {
          throw module.createError("getIframeWindow: No Window object found for iframe element");
        }
      }
    }
    function isWindow(obj) {
      return obj && util.isHostMethod(obj, "setTimeout") && util.isHostObject(obj, "document");
    }
    function getContentDocument(obj, module, methodName) {
      var doc;
      if (!obj) {
        doc = document;
      } else {
        if (util.isHostProperty(obj, "nodeType")) {
          doc = obj.nodeType == 1 && obj.tagName.toLowerCase() == "iframe" ? getIframeDocument(obj) : getDocument(obj);
        } else {
          if (isWindow(obj)) {
            doc = obj.document;
          }
        }
      }
      if (!doc) {
        throw module.createError(methodName + "(): Parameter must be a Window object or DOM node");
      }
      return doc;
    }
    function getRootContainer(node) {
      var parent;
      while (parent = node.parentNode) {
        node = parent;
      }
      return node;
    }
    function comparePoints(nodeA, offsetA, nodeB, offsetB) {
      var nodeC, root, childA, childB, n;
      if (nodeA == nodeB) {
        return offsetA === offsetB ? 0 : offsetA < offsetB ? -1 : 1;
      } else {
        if (nodeC = getClosestAncestorIn(nodeB, nodeA, true)) {
          return offsetA <= getNodeIndex(nodeC) ? -1 : 1;
        } else {
          if (nodeC = getClosestAncestorIn(nodeA, nodeB, true)) {
            return getNodeIndex(nodeC) < offsetB ? -1 : 1;
          } else {
            root = getCommonAncestor(nodeA, nodeB);
            if (!root) {
              throw new Error("comparePoints error: nodes have no common ancestor");
            }
            childA = nodeA === root ? root : getClosestAncestorIn(nodeA, root, true);
            childB = nodeB === root ? root : getClosestAncestorIn(nodeB, root, true);
            if (childA === childB) {
              throw module.createError("comparePoints got to case 4 and childA and childB are the same!");
            } else {
              n = root.firstChild;
              while (n) {
                if (n === childA) {
                  return-1;
                } else {
                  if (n === childB) {
                    return 1;
                  }
                }
                n = n.nextSibling;
              }
            }
          }
        }
      }
    }
    var crashyTextNodes = false;
    function isBrokenNode(node) {
      var n;
      try {
        n = node.parentNode;
        return false;
      } catch (e) {
        return true;
      }
    }
    (function() {
      var el = document.createElement("b");
      el.innerHTML = "1";
      var textNode = el.firstChild;
      el.innerHTML = "<br>";
      crashyTextNodes = isBrokenNode(textNode);
      api.features.crashyTextNodes = crashyTextNodes;
    })();
    function inspectNode(node) {
      if (!node) {
        return "[No node]";
      }
      if (crashyTextNodes && isBrokenNode(node)) {
        return "[Broken node]";
      }
      if (isCharacterDataNode(node)) {
        return'"' + node.data + '"';
      }
      if (node.nodeType == 1) {
        var idAttr = node.id ? ' id="' + node.id + '"' : "";
        return "<" + node.nodeName + idAttr + ">[index:" + getNodeIndex(node) + ",length:" + node.childNodes.length + "][" + (node.innerHTML || "[innerHTML not supported]").slice(0, 25) + "]";
      }
      return node.nodeName;
    }
    function fragmentFromNodeChildren(node) {
      var fragment = getDocument(node).createDocumentFragment(), child;
      while (child = node.firstChild) {
        fragment.appendChild(child);
      }
      return fragment;
    }
    var getComputedStyleProperty;
    if (typeof window.getComputedStyle != UNDEF) {
      getComputedStyleProperty = function(el, propName) {
        return getWindow(el).getComputedStyle(el, null)[propName];
      };
    } else {
      if (typeof document.documentElement.currentStyle != UNDEF) {
        getComputedStyleProperty = function(el, propName) {
          return el.currentStyle[propName];
        };
      } else {
        module.fail("No means of obtaining computed style properties found");
      }
    }
    function NodeIterator(root) {
      this.root = root;
      this._next = root;
    }
    NodeIterator.prototype = {_current:null, hasNext:function() {
      return!!this._next;
    }, next:function() {
      var n = this._current = this._next;
      var child, next;
      if (this._current) {
        child = n.firstChild;
        if (child) {
          this._next = child;
        } else {
          next = null;
          while (n !== this.root && !(next = n.nextSibling)) {
            n = n.parentNode;
          }
          this._next = next;
        }
      }
      return this._current;
    }, detach:function() {
      this._current = this._next = this.root = null;
    }};
    function createIterator(root) {
      return new NodeIterator(root);
    }
    function DomPosition(node, offset) {
      this.node = node;
      this.offset = offset;
    }
    DomPosition.prototype = {equals:function(pos) {
      return!!pos && this.node === pos.node && this.offset == pos.offset;
    }, inspect:function() {
      return "[DomPosition(" + inspectNode(this.node) + ":" + this.offset + ")]";
    }, toString:function() {
      return this.inspect();
    }};
    function DOMException(codeName) {
      this.code = this[codeName];
      this.codeName = codeName;
      this.message = "DOMException: " + this.codeName;
    }
    DOMException.prototype = {INDEX_SIZE_ERR:1, HIERARCHY_REQUEST_ERR:3, WRONG_DOCUMENT_ERR:4, NO_MODIFICATION_ALLOWED_ERR:7, NOT_FOUND_ERR:8, NOT_SUPPORTED_ERR:9, INVALID_STATE_ERR:11, INVALID_NODE_TYPE_ERR:24};
    DOMException.prototype.toString = function() {
      return this.message;
    };
    api.dom = {arrayContains:arrayContains, isHtmlNamespace:isHtmlNamespace, parentElement:parentElement, getNodeIndex:getNodeIndex, getNodeLength:getNodeLength, getCommonAncestor:getCommonAncestor, isAncestorOf:isAncestorOf, isOrIsAncestorOf:isOrIsAncestorOf, getClosestAncestorIn:getClosestAncestorIn, isCharacterDataNode:isCharacterDataNode, isTextOrCommentNode:isTextOrCommentNode, insertAfter:insertAfter, splitDataNode:splitDataNode, getDocument:getDocument, getWindow:getWindow, getIframeWindow:getIframeWindow, 
    getIframeDocument:getIframeDocument, getBody:util.getBody, isWindow:isWindow, getContentDocument:getContentDocument, getRootContainer:getRootContainer, comparePoints:comparePoints, isBrokenNode:isBrokenNode, inspectNode:inspectNode, getComputedStyleProperty:getComputedStyleProperty, fragmentFromNodeChildren:fragmentFromNodeChildren, createIterator:createIterator, DomPosition:DomPosition};
    api.DOMException = DOMException;
  });
  api.createCoreModule("DomRange", ["DomUtil"], function(api, module) {
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DOMException = api.DOMException;
    var isCharacterDataNode = dom.isCharacterDataNode;
    var getNodeIndex = dom.getNodeIndex;
    var isOrIsAncestorOf = dom.isOrIsAncestorOf;
    var getDocument = dom.getDocument;
    var comparePoints = dom.comparePoints;
    var splitDataNode = dom.splitDataNode;
    var getClosestAncestorIn = dom.getClosestAncestorIn;
    var getNodeLength = dom.getNodeLength;
    var arrayContains = dom.arrayContains;
    var getRootContainer = dom.getRootContainer;
    var crashyTextNodes = api.features.crashyTextNodes;
    function isNonTextPartiallySelected(node, range) {
      return node.nodeType != 3 && (isOrIsAncestorOf(node, range.startContainer) || isOrIsAncestorOf(node, range.endContainer));
    }
    function getRangeDocument(range) {
      return range.document || getDocument(range.startContainer);
    }
    function getBoundaryBeforeNode(node) {
      return new DomPosition(node.parentNode, getNodeIndex(node));
    }
    function getBoundaryAfterNode(node) {
      return new DomPosition(node.parentNode, getNodeIndex(node) + 1);
    }
    function insertNodeAtPosition(node, n, o) {
      var firstNodeInserted = node.nodeType == 11 ? node.firstChild : node;
      if (isCharacterDataNode(n)) {
        if (o == n.length) {
          dom.insertAfter(node, n);
        } else {
          n.parentNode.insertBefore(node, o == 0 ? n : splitDataNode(n, o));
        }
      } else {
        if (o >= n.childNodes.length) {
          n.appendChild(node);
        } else {
          n.insertBefore(node, n.childNodes[o]);
        }
      }
      return firstNodeInserted;
    }
    function rangesIntersect(rangeA, rangeB, touchingIsIntersecting) {
      assertRangeValid(rangeA);
      assertRangeValid(rangeB);
      if (getRangeDocument(rangeB) != getRangeDocument(rangeA)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
      var startComparison = comparePoints(rangeA.startContainer, rangeA.startOffset, rangeB.endContainer, rangeB.endOffset), endComparison = comparePoints(rangeA.endContainer, rangeA.endOffset, rangeB.startContainer, rangeB.startOffset);
      return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }
    function cloneSubtree(iterator) {
      var partiallySelected;
      for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator;node = iterator.next();) {
        partiallySelected = iterator.isPartiallySelectedSubtree();
        node = node.cloneNode(!partiallySelected);
        if (partiallySelected) {
          subIterator = iterator.getSubtreeIterator();
          node.appendChild(cloneSubtree(subIterator));
          subIterator.detach();
        }
        if (node.nodeType == 10) {
          throw new DOMException("HIERARCHY_REQUEST_ERR");
        }
        frag.appendChild(node);
      }
      return frag;
    }
    function iterateSubtree(rangeIterator, func, iteratorState) {
      var it, n;
      iteratorState = iteratorState || {stop:false};
      for (var node, subRangeIterator;node = rangeIterator.next();) {
        if (rangeIterator.isPartiallySelectedSubtree()) {
          if (func(node) === false) {
            iteratorState.stop = true;
            return;
          } else {
            subRangeIterator = rangeIterator.getSubtreeIterator();
            iterateSubtree(subRangeIterator, func, iteratorState);
            subRangeIterator.detach();
            if (iteratorState.stop) {
              return;
            }
          }
        } else {
          it = dom.createIterator(node);
          while (n = it.next()) {
            if (func(n) === false) {
              iteratorState.stop = true;
              return;
            }
          }
        }
      }
    }
    function deleteSubtree(iterator) {
      var subIterator;
      while (iterator.next()) {
        if (iterator.isPartiallySelectedSubtree()) {
          subIterator = iterator.getSubtreeIterator();
          deleteSubtree(subIterator);
          subIterator.detach();
        } else {
          iterator.remove();
        }
      }
    }
    function extractSubtree(iterator) {
      for (var node, frag = getRangeDocument(iterator.range).createDocumentFragment(), subIterator;node = iterator.next();) {
        if (iterator.isPartiallySelectedSubtree()) {
          node = node.cloneNode(false);
          subIterator = iterator.getSubtreeIterator();
          node.appendChild(extractSubtree(subIterator));
          subIterator.detach();
        } else {
          iterator.remove();
        }
        if (node.nodeType == 10) {
          throw new DOMException("HIERARCHY_REQUEST_ERR");
        }
        frag.appendChild(node);
      }
      return frag;
    }
    function getNodesInRange(range, nodeTypes, filter) {
      var filterNodeTypes = !!(nodeTypes && nodeTypes.length), regex;
      var filterExists = !!filter;
      if (filterNodeTypes) {
        regex = new RegExp("^(" + nodeTypes.join("|") + ")$");
      }
      var nodes = [];
      iterateSubtree(new RangeIterator(range, false), function(node) {
        if (filterNodeTypes && !regex.test(node.nodeType)) {
          return;
        }
        if (filterExists && !filter(node)) {
          return;
        }
        var sc = range.startContainer;
        if (node == sc && isCharacterDataNode(sc) && range.startOffset == sc.length) {
          return;
        }
        var ec = range.endContainer;
        if (node == ec && isCharacterDataNode(ec) && range.endOffset == 0) {
          return;
        }
        nodes.push(node);
      });
      return nodes;
    }
    function inspect(range) {
      var name = typeof range.getName == "undefined" ? "Range" : range.getName();
      return "[" + name + "(" + dom.inspectNode(range.startContainer) + ":" + range.startOffset + ", " + dom.inspectNode(range.endContainer) + ":" + range.endOffset + ")]";
    }
    function RangeIterator(range, clonePartiallySelectedTextNodes) {
      this.range = range;
      this.clonePartiallySelectedTextNodes = clonePartiallySelectedTextNodes;
      if (!range.collapsed) {
        this.sc = range.startContainer;
        this.so = range.startOffset;
        this.ec = range.endContainer;
        this.eo = range.endOffset;
        var root = range.commonAncestorContainer;
        if (this.sc === this.ec && isCharacterDataNode(this.sc)) {
          this.isSingleCharacterDataNode = true;
          this._first = this._last = this._next = this.sc;
        } else {
          this._first = this._next = this.sc === root && !isCharacterDataNode(this.sc) ? this.sc.childNodes[this.so] : getClosestAncestorIn(this.sc, root, true);
          this._last = this.ec === root && !isCharacterDataNode(this.ec) ? this.ec.childNodes[this.eo - 1] : getClosestAncestorIn(this.ec, root, true);
        }
      }
    }
    RangeIterator.prototype = {_current:null, _next:null, _first:null, _last:null, isSingleCharacterDataNode:false, reset:function() {
      this._current = null;
      this._next = this._first;
    }, hasNext:function() {
      return!!this._next;
    }, next:function() {
      var current = this._current = this._next;
      if (current) {
        this._next = current !== this._last ? current.nextSibling : null;
        if (isCharacterDataNode(current) && this.clonePartiallySelectedTextNodes) {
          if (current === this.ec) {
            (current = current.cloneNode(true)).deleteData(this.eo, current.length - this.eo);
          }
          if (this._current === this.sc) {
            (current = current.cloneNode(true)).deleteData(0, this.so);
          }
        }
      }
      return current;
    }, remove:function() {
      var current = this._current, start, end;
      if (isCharacterDataNode(current) && (current === this.sc || current === this.ec)) {
        start = current === this.sc ? this.so : 0;
        end = current === this.ec ? this.eo : current.length;
        if (start != end) {
          current.deleteData(start, end - start);
        }
      } else {
        if (current.parentNode) {
          current.parentNode.removeChild(current);
        } else {
        }
      }
    }, isPartiallySelectedSubtree:function() {
      var current = this._current;
      return isNonTextPartiallySelected(current, this.range);
    }, getSubtreeIterator:function() {
      var subRange;
      if (this.isSingleCharacterDataNode) {
        subRange = this.range.cloneRange();
        subRange.collapse(false);
      } else {
        subRange = new Range(getRangeDocument(this.range));
        var current = this._current;
        var startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);
        if (isOrIsAncestorOf(current, this.sc)) {
          startContainer = this.sc;
          startOffset = this.so;
        }
        if (isOrIsAncestorOf(current, this.ec)) {
          endContainer = this.ec;
          endOffset = this.eo;
        }
        updateBoundaries(subRange, startContainer, startOffset, endContainer, endOffset);
      }
      return new RangeIterator(subRange, this.clonePartiallySelectedTextNodes);
    }, detach:function() {
      this.range = this._current = this._next = this._first = this._last = this.sc = this.so = this.ec = this.eo = null;
    }};
    var beforeAfterNodeTypes = [1, 3, 4, 5, 7, 8, 10];
    var rootContainerNodeTypes = [2, 9, 11];
    var readonlyNodeTypes = [5, 6, 10, 12];
    var insertableNodeTypes = [1, 3, 4, 5, 7, 8, 10, 11];
    var surroundNodeTypes = [1, 3, 4, 5, 7, 8];
    function createAncestorFinder(nodeTypes) {
      return function(node, selfIsAncestor) {
        var t, n = selfIsAncestor ? node : node.parentNode;
        while (n) {
          t = n.nodeType;
          if (arrayContains(nodeTypes, t)) {
            return n;
          }
          n = n.parentNode;
        }
        return null;
      };
    }
    var getDocumentOrFragmentContainer = createAncestorFinder([9, 11]);
    var getReadonlyAncestor = createAncestorFinder(readonlyNodeTypes);
    var getDocTypeNotationEntityAncestor = createAncestorFinder([6, 10, 12]);
    function assertNoDocTypeNotationEntityAncestor(node, allowSelf) {
      if (getDocTypeNotationEntityAncestor(node, allowSelf)) {
        throw new DOMException("INVALID_NODE_TYPE_ERR");
      }
    }
    function assertValidNodeType(node, invalidTypes) {
      if (!arrayContains(invalidTypes, node.nodeType)) {
        throw new DOMException("INVALID_NODE_TYPE_ERR");
      }
    }
    function assertValidOffset(node, offset) {
      if (offset < 0 || offset > (isCharacterDataNode(node) ? node.length : node.childNodes.length)) {
        throw new DOMException("INDEX_SIZE_ERR");
      }
    }
    function assertSameDocumentOrFragment(node1, node2) {
      if (getDocumentOrFragmentContainer(node1, true) !== getDocumentOrFragmentContainer(node2, true)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
    }
    function assertNodeNotReadOnly(node) {
      if (getReadonlyAncestor(node, true)) {
        throw new DOMException("NO_MODIFICATION_ALLOWED_ERR");
      }
    }
    function assertNode(node, codeName) {
      if (!node) {
        throw new DOMException(codeName);
      }
    }
    function isOrphan(node) {
      return crashyTextNodes && dom.isBrokenNode(node) || !arrayContains(rootContainerNodeTypes, node.nodeType) && !getDocumentOrFragmentContainer(node, true);
    }
    function isValidOffset(node, offset) {
      return offset <= (isCharacterDataNode(node) ? node.length : node.childNodes.length);
    }
    function isRangeValid(range) {
      return!!range.startContainer && !!range.endContainer && !isOrphan(range.startContainer) && !isOrphan(range.endContainer) && isValidOffset(range.startContainer, range.startOffset) && isValidOffset(range.endContainer, range.endOffset);
    }
    function assertRangeValid(range) {
      if (!isRangeValid(range)) {
        throw new Error("Range error: Range is no longer valid after DOM mutation (" + range.inspect() + ")");
      }
    }
    var styleEl = document.createElement("style");
    var htmlParsingConforms = false;
    try {
      styleEl.innerHTML = "<b>x</b>";
      htmlParsingConforms = styleEl.firstChild.nodeType == 3;
    } catch (e) {
    }
    api.features.htmlParsingConforms = htmlParsingConforms;
    var createContextualFragment = htmlParsingConforms ? function(fragmentStr) {
      var node = this.startContainer;
      var doc = getDocument(node);
      if (!node) {
        throw new DOMException("INVALID_STATE_ERR");
      }
      var el = null;
      if (node.nodeType == 1) {
        el = node;
      } else {
        if (isCharacterDataNode(node)) {
          el = dom.parentElement(node);
        }
      }
      if (el === null || el.nodeName == "HTML" && dom.isHtmlNamespace(getDocument(el).documentElement) && dom.isHtmlNamespace(el)) {
        el = doc.createElement("body");
      } else {
        el = el.cloneNode(false);
      }
      el.innerHTML = fragmentStr;
      return dom.fragmentFromNodeChildren(el);
    } : function(fragmentStr) {
      var doc = getRangeDocument(this);
      var el = doc.createElement("body");
      el.innerHTML = fragmentStr;
      return dom.fragmentFromNodeChildren(el);
    };
    function splitRangeBoundaries(range, positionsToPreserve) {
      assertRangeValid(range);
      var sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset;
      var startEndSame = sc === ec;
      if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
        splitDataNode(ec, eo, positionsToPreserve);
      }
      if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
        sc = splitDataNode(sc, so, positionsToPreserve);
        if (startEndSame) {
          eo -= so;
          ec = sc;
        } else {
          if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
            eo++;
          }
        }
        so = 0;
      }
      range.setStartAndEnd(sc, so, ec, eo);
    }
    function rangeToHtml(range) {
      assertRangeValid(range);
      var container = range.commonAncestorContainer.parentNode.cloneNode(false);
      container.appendChild(range.cloneContents());
      return container.innerHTML;
    }
    var rangeProperties = ["startContainer", "startOffset", "endContainer", "endOffset", "collapsed", "commonAncestorContainer"];
    var s2s = 0, s2e = 1, e2e = 2, e2s = 3;
    var n_b = 0, n_a = 1, n_b_a = 2, n_i = 3;
    util.extend(api.rangePrototype, {compareBoundaryPoints:function(how, range) {
      assertRangeValid(this);
      assertSameDocumentOrFragment(this.startContainer, range.startContainer);
      var nodeA, offsetA, nodeB, offsetB;
      var prefixA = how == e2s || how == s2s ? "start" : "end";
      var prefixB = how == s2e || how == s2s ? "start" : "end";
      nodeA = this[prefixA + "Container"];
      offsetA = this[prefixA + "Offset"];
      nodeB = range[prefixB + "Container"];
      offsetB = range[prefixB + "Offset"];
      return comparePoints(nodeA, offsetA, nodeB, offsetB);
    }, insertNode:function(node) {
      assertRangeValid(this);
      assertValidNodeType(node, insertableNodeTypes);
      assertNodeNotReadOnly(this.startContainer);
      if (isOrIsAncestorOf(node, this.startContainer)) {
        throw new DOMException("HIERARCHY_REQUEST_ERR");
      }
      var firstNodeInserted = insertNodeAtPosition(node, this.startContainer, this.startOffset);
      this.setStartBefore(firstNodeInserted);
    }, cloneContents:function() {
      assertRangeValid(this);
      var clone, frag;
      if (this.collapsed) {
        return getRangeDocument(this).createDocumentFragment();
      } else {
        if (this.startContainer === this.endContainer && isCharacterDataNode(this.startContainer)) {
          clone = this.startContainer.cloneNode(true);
          clone.data = clone.data.slice(this.startOffset, this.endOffset);
          frag = getRangeDocument(this).createDocumentFragment();
          frag.appendChild(clone);
          return frag;
        } else {
          var iterator = new RangeIterator(this, true);
          clone = cloneSubtree(iterator);
          iterator.detach();
        }
        return clone;
      }
    }, canSurroundContents:function() {
      assertRangeValid(this);
      assertNodeNotReadOnly(this.startContainer);
      assertNodeNotReadOnly(this.endContainer);
      var iterator = new RangeIterator(this, true);
      var boundariesInvalid = iterator._first && isNonTextPartiallySelected(iterator._first, this) || iterator._last && isNonTextPartiallySelected(iterator._last, this);
      iterator.detach();
      return!boundariesInvalid;
    }, surroundContents:function(node) {
      assertValidNodeType(node, surroundNodeTypes);
      if (!this.canSurroundContents()) {
        throw new DOMException("INVALID_STATE_ERR");
      }
      var content = this.extractContents();
      if (node.hasChildNodes()) {
        while (node.lastChild) {
          node.removeChild(node.lastChild);
        }
      }
      insertNodeAtPosition(node, this.startContainer, this.startOffset);
      node.appendChild(content);
      this.selectNode(node);
    }, cloneRange:function() {
      assertRangeValid(this);
      var range = new Range(getRangeDocument(this));
      var i = rangeProperties.length, prop;
      while (i--) {
        prop = rangeProperties[i];
        range[prop] = this[prop];
      }
      return range;
    }, toString:function() {
      assertRangeValid(this);
      var sc = this.startContainer;
      if (sc === this.endContainer && isCharacterDataNode(sc)) {
        return sc.nodeType == 3 || sc.nodeType == 4 ? sc.data.slice(this.startOffset, this.endOffset) : "";
      } else {
        var textParts = [], iterator = new RangeIterator(this, true);
        iterateSubtree(iterator, function(node) {
          if (node.nodeType == 3 || node.nodeType == 4) {
            textParts.push(node.data);
          }
        });
        iterator.detach();
        return textParts.join("");
      }
    }, compareNode:function(node) {
      assertRangeValid(this);
      var parent = node.parentNode;
      var nodeIndex = getNodeIndex(node);
      if (!parent) {
        throw new DOMException("NOT_FOUND_ERR");
      }
      var startComparison = this.comparePoint(parent, nodeIndex), endComparison = this.comparePoint(parent, nodeIndex + 1);
      if (startComparison < 0) {
        return endComparison > 0 ? n_b_a : n_b;
      } else {
        return endComparison > 0 ? n_a : n_i;
      }
    }, comparePoint:function(node, offset) {
      assertRangeValid(this);
      assertNode(node, "HIERARCHY_REQUEST_ERR");
      assertSameDocumentOrFragment(node, this.startContainer);
      if (comparePoints(node, offset, this.startContainer, this.startOffset) < 0) {
        return-1;
      } else {
        if (comparePoints(node, offset, this.endContainer, this.endOffset) > 0) {
          return 1;
        }
      }
      return 0;
    }, createContextualFragment:createContextualFragment, toHtml:function() {
      return rangeToHtml(this);
    }, intersectsNode:function(node, touchingIsIntersecting) {
      assertRangeValid(this);
      assertNode(node, "NOT_FOUND_ERR");
      if (getDocument(node) !== getRangeDocument(this)) {
        return false;
      }
      var parent = node.parentNode, offset = getNodeIndex(node);
      assertNode(parent, "NOT_FOUND_ERR");
      var startComparison = comparePoints(parent, offset, this.endContainer, this.endOffset), endComparison = comparePoints(parent, offset + 1, this.startContainer, this.startOffset);
      return touchingIsIntersecting ? startComparison <= 0 && endComparison >= 0 : startComparison < 0 && endComparison > 0;
    }, isPointInRange:function(node, offset) {
      assertRangeValid(this);
      assertNode(node, "HIERARCHY_REQUEST_ERR");
      assertSameDocumentOrFragment(node, this.startContainer);
      return comparePoints(node, offset, this.startContainer, this.startOffset) >= 0 && comparePoints(node, offset, this.endContainer, this.endOffset) <= 0;
    }, intersectsRange:function(range) {
      return rangesIntersect(this, range, false);
    }, intersectsOrTouchesRange:function(range) {
      return rangesIntersect(this, range, true);
    }, intersection:function(range) {
      if (this.intersectsRange(range)) {
        var startComparison = comparePoints(this.startContainer, this.startOffset, range.startContainer, range.startOffset), endComparison = comparePoints(this.endContainer, this.endOffset, range.endContainer, range.endOffset);
        var intersectionRange = this.cloneRange();
        if (startComparison == -1) {
          intersectionRange.setStart(range.startContainer, range.startOffset);
        }
        if (endComparison == 1) {
          intersectionRange.setEnd(range.endContainer, range.endOffset);
        }
        return intersectionRange;
      }
      return null;
    }, union:function(range) {
      if (this.intersectsOrTouchesRange(range)) {
        var unionRange = this.cloneRange();
        if (comparePoints(range.startContainer, range.startOffset, this.startContainer, this.startOffset) == -1) {
          unionRange.setStart(range.startContainer, range.startOffset);
        }
        if (comparePoints(range.endContainer, range.endOffset, this.endContainer, this.endOffset) == 1) {
          unionRange.setEnd(range.endContainer, range.endOffset);
        }
        return unionRange;
      } else {
        throw new DOMException("Ranges do not intersect");
      }
    }, containsNode:function(node, allowPartial) {
      if (allowPartial) {
        return this.intersectsNode(node, false);
      } else {
        return this.compareNode(node) == n_i;
      }
    }, containsNodeContents:function(node) {
      return this.comparePoint(node, 0) >= 0 && this.comparePoint(node, getNodeLength(node)) <= 0;
    }, containsRange:function(range) {
      var intersection = this.intersection(range);
      return intersection !== null && range.equals(intersection);
    }, containsNodeText:function(node) {
      var nodeRange = this.cloneRange();
      nodeRange.selectNode(node);
      var textNodes = nodeRange.getNodes([3]);
      if (textNodes.length > 0) {
        nodeRange.setStart(textNodes[0], 0);
        var lastTextNode = textNodes.pop();
        nodeRange.setEnd(lastTextNode, lastTextNode.length);
        return this.containsRange(nodeRange);
      } else {
        return this.containsNodeContents(node);
      }
    }, getNodes:function(nodeTypes, filter) {
      assertRangeValid(this);
      return getNodesInRange(this, nodeTypes, filter);
    }, getDocument:function() {
      return getRangeDocument(this);
    }, collapseBefore:function(node) {
      this.setEndBefore(node);
      this.collapse(false);
    }, collapseAfter:function(node) {
      this.setStartAfter(node);
      this.collapse(true);
    }, getBookmark:function(containerNode) {
      var doc = getRangeDocument(this);
      var preSelectionRange = api.createRange(doc);
      containerNode = containerNode || dom.getBody(doc);
      preSelectionRange.selectNodeContents(containerNode);
      var range = this.intersection(preSelectionRange);
      var start = 0, end = 0;
      if (range) {
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        start = preSelectionRange.toString().length;
        end = start + range.toString().length;
      }
      return{start:start, end:end, containerNode:containerNode};
    }, moveToBookmark:function(bookmark) {
      var containerNode = bookmark.containerNode;
      var charIndex = 0;
      this.setStart(containerNode, 0);
      this.collapse(true);
      var nodeStack = [containerNode], node, foundStart = false, stop = false;
      var nextCharIndex, i, childNodes;
      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType == 3) {
          nextCharIndex = charIndex + node.length;
          if (!foundStart && bookmark.start >= charIndex && bookmark.start <= nextCharIndex) {
            this.setStart(node, bookmark.start - charIndex);
            foundStart = true;
          }
          if (foundStart && bookmark.end >= charIndex && bookmark.end <= nextCharIndex) {
            this.setEnd(node, bookmark.end - charIndex);
            stop = true;
          }
          charIndex = nextCharIndex;
        } else {
          childNodes = node.childNodes;
          i = childNodes.length;
          while (i--) {
            nodeStack.push(childNodes[i]);
          }
        }
      }
    }, getName:function() {
      return "DomRange";
    }, equals:function(range) {
      return Range.rangesEqual(this, range);
    }, isValid:function() {
      return isRangeValid(this);
    }, inspect:function() {
      return inspect(this);
    }, detach:function() {
    }});
    function copyComparisonConstantsToObject(obj) {
      obj.START_TO_START = s2s;
      obj.START_TO_END = s2e;
      obj.END_TO_END = e2e;
      obj.END_TO_START = e2s;
      obj.NODE_BEFORE = n_b;
      obj.NODE_AFTER = n_a;
      obj.NODE_BEFORE_AND_AFTER = n_b_a;
      obj.NODE_INSIDE = n_i;
    }
    function copyComparisonConstants(constructor) {
      copyComparisonConstantsToObject(constructor);
      copyComparisonConstantsToObject(constructor.prototype);
    }
    function createRangeContentRemover(remover, boundaryUpdater) {
      return function() {
        assertRangeValid(this);
        var sc = this.startContainer, so = this.startOffset, root = this.commonAncestorContainer;
        var iterator = new RangeIterator(this, true);
        var node, boundary;
        if (sc !== root) {
          node = getClosestAncestorIn(sc, root, true);
          boundary = getBoundaryAfterNode(node);
          sc = boundary.node;
          so = boundary.offset;
        }
        iterateSubtree(iterator, assertNodeNotReadOnly);
        iterator.reset();
        var returnValue = remover(iterator);
        iterator.detach();
        boundaryUpdater(this, sc, so, sc, so);
        return returnValue;
      };
    }
    function createPrototypeRange(constructor, boundaryUpdater) {
      function createBeforeAfterNodeSetter(isBefore, isStart) {
        return function(node) {
          assertValidNodeType(node, beforeAfterNodeTypes);
          assertValidNodeType(getRootContainer(node), rootContainerNodeTypes);
          var boundary = (isBefore ? getBoundaryBeforeNode : getBoundaryAfterNode)(node);
          (isStart ? setRangeStart : setRangeEnd)(this, boundary.node, boundary.offset);
        };
      }
      function setRangeStart(range, node, offset) {
        var ec = range.endContainer, eo = range.endOffset;
        if (node !== range.startContainer || offset !== range.startOffset) {
          if (getRootContainer(node) != getRootContainer(ec) || comparePoints(node, offset, ec, eo) == 1) {
            ec = node;
            eo = offset;
          }
          boundaryUpdater(range, node, offset, ec, eo);
        }
      }
      function setRangeEnd(range, node, offset) {
        var sc = range.startContainer, so = range.startOffset;
        if (node !== range.endContainer || offset !== range.endOffset) {
          if (getRootContainer(node) != getRootContainer(sc) || comparePoints(node, offset, sc, so) == -1) {
            sc = node;
            so = offset;
          }
          boundaryUpdater(range, sc, so, node, offset);
        }
      }
      var F = function() {
      };
      F.prototype = api.rangePrototype;
      constructor.prototype = new F;
      util.extend(constructor.prototype, {setStart:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        setRangeStart(this, node, offset);
      }, setEnd:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        setRangeEnd(this, node, offset);
      }, setStartAndEnd:function() {
        var args = arguments;
        var sc = args[0], so = args[1], ec = sc, eo = so;
        switch(args.length) {
          case 3:
            eo = args[2];
            break;
          case 4:
            ec = args[2];
            eo = args[3];
            break;
        }
        boundaryUpdater(this, sc, so, ec, eo);
      }, setBoundary:function(node, offset, isStart) {
        this["set" + (isStart ? "Start" : "End")](node, offset);
      }, setStartBefore:createBeforeAfterNodeSetter(true, true), setStartAfter:createBeforeAfterNodeSetter(false, true), setEndBefore:createBeforeAfterNodeSetter(true, false), setEndAfter:createBeforeAfterNodeSetter(false, false), collapse:function(isStart) {
        assertRangeValid(this);
        if (isStart) {
          boundaryUpdater(this, this.startContainer, this.startOffset, this.startContainer, this.startOffset);
        } else {
          boundaryUpdater(this, this.endContainer, this.endOffset, this.endContainer, this.endOffset);
        }
      }, selectNodeContents:function(node) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        boundaryUpdater(this, node, 0, node, getNodeLength(node));
      }, selectNode:function(node) {
        assertNoDocTypeNotationEntityAncestor(node, false);
        assertValidNodeType(node, beforeAfterNodeTypes);
        var start = getBoundaryBeforeNode(node), end = getBoundaryAfterNode(node);
        boundaryUpdater(this, start.node, start.offset, end.node, end.offset);
      }, extractContents:createRangeContentRemover(extractSubtree, boundaryUpdater), deleteContents:createRangeContentRemover(deleteSubtree, boundaryUpdater), canSurroundContents:function() {
        assertRangeValid(this);
        assertNodeNotReadOnly(this.startContainer);
        assertNodeNotReadOnly(this.endContainer);
        var iterator = new RangeIterator(this, true);
        var boundariesInvalid = iterator._first && isNonTextPartiallySelected(iterator._first, this) || iterator._last && isNonTextPartiallySelected(iterator._last, this);
        iterator.detach();
        return!boundariesInvalid;
      }, splitBoundaries:function() {
        splitRangeBoundaries(this);
      }, splitBoundariesPreservingPositions:function(positionsToPreserve) {
        splitRangeBoundaries(this, positionsToPreserve);
      }, normalizeBoundaries:function() {
        assertRangeValid(this);
        var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset;
        var mergeForward = function(node) {
          var sibling = node.nextSibling;
          if (sibling && sibling.nodeType == node.nodeType) {
            ec = node;
            eo = node.length;
            node.appendData(sibling.data);
            sibling.parentNode.removeChild(sibling);
          }
        };
        var mergeBackward = function(node) {
          var sibling = node.previousSibling;
          if (sibling && sibling.nodeType == node.nodeType) {
            sc = node;
            var nodeLength = node.length;
            so = sibling.length;
            node.insertData(0, sibling.data);
            sibling.parentNode.removeChild(sibling);
            if (sc == ec) {
              eo += so;
              ec = sc;
            } else {
              if (ec == node.parentNode) {
                var nodeIndex = getNodeIndex(node);
                if (eo == nodeIndex) {
                  ec = node;
                  eo = nodeLength;
                } else {
                  if (eo > nodeIndex) {
                    eo--;
                  }
                }
              }
            }
          }
        };
        var normalizeStart = true;
        if (isCharacterDataNode(ec)) {
          if (ec.length == eo) {
            mergeForward(ec);
          }
        } else {
          if (eo > 0) {
            var endNode = ec.childNodes[eo - 1];
            if (endNode && isCharacterDataNode(endNode)) {
              mergeForward(endNode);
            }
          }
          normalizeStart = !this.collapsed;
        }
        if (normalizeStart) {
          if (isCharacterDataNode(sc)) {
            if (so == 0) {
              mergeBackward(sc);
            }
          } else {
            if (so < sc.childNodes.length) {
              var startNode = sc.childNodes[so];
              if (startNode && isCharacterDataNode(startNode)) {
                mergeBackward(startNode);
              }
            }
          }
        } else {
          sc = ec;
          so = eo;
        }
        boundaryUpdater(this, sc, so, ec, eo);
      }, collapseToPoint:function(node, offset) {
        assertNoDocTypeNotationEntityAncestor(node, true);
        assertValidOffset(node, offset);
        this.setStartAndEnd(node, offset);
      }});
      copyComparisonConstants(constructor);
    }
    function updateCollapsedAndCommonAncestor(range) {
      range.collapsed = range.startContainer === range.endContainer && range.startOffset === range.endOffset;
      range.commonAncestorContainer = range.collapsed ? range.startContainer : dom.getCommonAncestor(range.startContainer, range.endContainer);
    }
    function updateBoundaries(range, startContainer, startOffset, endContainer, endOffset) {
      range.startContainer = startContainer;
      range.startOffset = startOffset;
      range.endContainer = endContainer;
      range.endOffset = endOffset;
      range.document = dom.getDocument(startContainer);
      updateCollapsedAndCommonAncestor(range);
    }
    function Range(doc) {
      this.startContainer = doc;
      this.startOffset = 0;
      this.endContainer = doc;
      this.endOffset = 0;
      this.document = doc;
      updateCollapsedAndCommonAncestor(this);
    }
    createPrototypeRange(Range, updateBoundaries);
    util.extend(Range, {rangeProperties:rangeProperties, RangeIterator:RangeIterator, copyComparisonConstants:copyComparisonConstants, createPrototypeRange:createPrototypeRange, inspect:inspect, toHtml:rangeToHtml, getRangeDocument:getRangeDocument, rangesEqual:function(r1, r2) {
      return r1.startContainer === r2.startContainer && r1.startOffset === r2.startOffset && r1.endContainer === r2.endContainer && r1.endOffset === r2.endOffset;
    }});
    api.DomRange = Range;
  });
  api.createCoreModule("WrappedRange", ["DomRange"], function(api, module) {
    var WrappedRange, WrappedTextRange;
    var dom = api.dom;
    var util = api.util;
    var DomPosition = dom.DomPosition;
    var DomRange = api.DomRange;
    var getBody = dom.getBody;
    var getContentDocument = dom.getContentDocument;
    var isCharacterDataNode = dom.isCharacterDataNode;
    if (api.features.implementsDomRange) {
      (function() {
        var rangeProto;
        var rangeProperties = DomRange.rangeProperties;
        function updateRangeProperties(range) {
          var i = rangeProperties.length, prop;
          while (i--) {
            prop = rangeProperties[i];
            range[prop] = range.nativeRange[prop];
          }
          range.collapsed = range.startContainer === range.endContainer && range.startOffset === range.endOffset;
        }
        function updateNativeRange(range, startContainer, startOffset, endContainer, endOffset) {
          var startMoved = range.startContainer !== startContainer || range.startOffset != startOffset;
          var endMoved = range.endContainer !== endContainer || range.endOffset != endOffset;
          var nativeRangeDifferent = !range.equals(range.nativeRange);
          if (startMoved || endMoved || nativeRangeDifferent) {
            range.setEnd(endContainer, endOffset);
            range.setStart(startContainer, startOffset);
          }
        }
        var createBeforeAfterNodeSetter;
        WrappedRange = function(range) {
          if (!range) {
            throw module.createError("WrappedRange: Range must be specified");
          }
          this.nativeRange = range;
          updateRangeProperties(this);
        };
        DomRange.createPrototypeRange(WrappedRange, updateNativeRange);
        rangeProto = WrappedRange.prototype;
        rangeProto.selectNode = function(node) {
          this.nativeRange.selectNode(node);
          updateRangeProperties(this);
        };
        rangeProto.cloneContents = function() {
          return this.nativeRange.cloneContents();
        };
        rangeProto.surroundContents = function(node) {
          this.nativeRange.surroundContents(node);
          updateRangeProperties(this);
        };
        rangeProto.collapse = function(isStart) {
          this.nativeRange.collapse(isStart);
          updateRangeProperties(this);
        };
        rangeProto.cloneRange = function() {
          return new WrappedRange(this.nativeRange.cloneRange());
        };
        rangeProto.refresh = function() {
          updateRangeProperties(this);
        };
        rangeProto.toString = function() {
          return this.nativeRange.toString();
        };
        var testTextNode = document.createTextNode("test");
        getBody(document).appendChild(testTextNode);
        var range = document.createRange();
        range.setStart(testTextNode, 0);
        range.setEnd(testTextNode, 0);
        try {
          range.setStart(testTextNode, 1);
          rangeProto.setStart = function(node, offset) {
            this.nativeRange.setStart(node, offset);
            updateRangeProperties(this);
          };
          rangeProto.setEnd = function(node, offset) {
            this.nativeRange.setEnd(node, offset);
            updateRangeProperties(this);
          };
          createBeforeAfterNodeSetter = function(name) {
            return function(node) {
              this.nativeRange[name](node);
              updateRangeProperties(this);
            };
          };
        } catch (ex) {
          rangeProto.setStart = function(node, offset) {
            try {
              this.nativeRange.setStart(node, offset);
            } catch (ex) {
              this.nativeRange.setEnd(node, offset);
              this.nativeRange.setStart(node, offset);
            }
            updateRangeProperties(this);
          };
          rangeProto.setEnd = function(node, offset) {
            try {
              this.nativeRange.setEnd(node, offset);
            } catch (ex) {
              this.nativeRange.setStart(node, offset);
              this.nativeRange.setEnd(node, offset);
            }
            updateRangeProperties(this);
          };
          createBeforeAfterNodeSetter = function(name, oppositeName) {
            return function(node) {
              try {
                this.nativeRange[name](node);
              } catch (ex) {
                this.nativeRange[oppositeName](node);
                this.nativeRange[name](node);
              }
              updateRangeProperties(this);
            };
          };
        }
        rangeProto.setStartBefore = createBeforeAfterNodeSetter("setStartBefore", "setEndBefore");
        rangeProto.setStartAfter = createBeforeAfterNodeSetter("setStartAfter", "setEndAfter");
        rangeProto.setEndBefore = createBeforeAfterNodeSetter("setEndBefore", "setStartBefore");
        rangeProto.setEndAfter = createBeforeAfterNodeSetter("setEndAfter", "setStartAfter");
        rangeProto.selectNodeContents = function(node) {
          this.setStartAndEnd(node, 0, dom.getNodeLength(node));
        };
        range.selectNodeContents(testTextNode);
        range.setEnd(testTextNode, 3);
        var range2 = document.createRange();
        range2.selectNodeContents(testTextNode);
        range2.setEnd(testTextNode, 4);
        range2.setStart(testTextNode, 2);
        if (range.compareBoundaryPoints(range.START_TO_END, range2) == -1 && range.compareBoundaryPoints(range.END_TO_START, range2) == 1) {
          rangeProto.compareBoundaryPoints = function(type, range) {
            range = range.nativeRange || range;
            if (type == range.START_TO_END) {
              type = range.END_TO_START;
            } else {
              if (type == range.END_TO_START) {
                type = range.START_TO_END;
              }
            }
            return this.nativeRange.compareBoundaryPoints(type, range);
          };
        } else {
          rangeProto.compareBoundaryPoints = function(type, range) {
            return this.nativeRange.compareBoundaryPoints(type, range.nativeRange || range);
          };
        }
        var el = document.createElement("div");
        el.innerHTML = "123";
        var textNode = el.firstChild;
        var body = getBody(document);
        body.appendChild(el);
        range.setStart(textNode, 1);
        range.setEnd(textNode, 2);
        range.deleteContents();
        if (textNode.data == "13") {
          rangeProto.deleteContents = function() {
            this.nativeRange.deleteContents();
            updateRangeProperties(this);
          };
          rangeProto.extractContents = function() {
            var frag = this.nativeRange.extractContents();
            updateRangeProperties(this);
            return frag;
          };
        } else {
        }
        body.removeChild(el);
        body = null;
        if (util.isHostMethod(range, "createContextualFragment")) {
          rangeProto.createContextualFragment = function(fragmentStr) {
            return this.nativeRange.createContextualFragment(fragmentStr);
          };
        }
        getBody(document).removeChild(testTextNode);
        rangeProto.getName = function() {
          return "WrappedRange";
        };
        api.WrappedRange = WrappedRange;
        api.createNativeRange = function(doc) {
          doc = getContentDocument(doc, module, "createNativeRange");
          return doc.createRange();
        };
      })();
    }
    if (api.features.implementsTextRange) {
      var getTextRangeContainerElement = function(textRange) {
        var parentEl = textRange.parentElement();
        var range = textRange.duplicate();
        range.collapse(true);
        var startEl = range.parentElement();
        range = textRange.duplicate();
        range.collapse(false);
        var endEl = range.parentElement();
        var startEndContainer = startEl == endEl ? startEl : dom.getCommonAncestor(startEl, endEl);
        return startEndContainer == parentEl ? startEndContainer : dom.getCommonAncestor(parentEl, startEndContainer);
      };
      var textRangeIsCollapsed = function(textRange) {
        return textRange.compareEndPoints("StartToEnd", textRange) == 0;
      };
      var getTextRangeBoundaryPosition = function(textRange, wholeRangeContainerElement, isStart, isCollapsed, startInfo) {
        var workingRange = textRange.duplicate();
        workingRange.collapse(isStart);
        var containerElement = workingRange.parentElement();
        if (!dom.isOrIsAncestorOf(wholeRangeContainerElement, containerElement)) {
          containerElement = wholeRangeContainerElement;
        }
        if (!containerElement.canHaveHTML) {
          var pos = new DomPosition(containerElement.parentNode, dom.getNodeIndex(containerElement));
          return{boundaryPosition:pos, nodeInfo:{nodeIndex:pos.offset, containerElement:pos.node}};
        }
        var workingNode = dom.getDocument(containerElement).createElement("span");
        if (workingNode.parentNode) {
          workingNode.parentNode.removeChild(workingNode);
        }
        var comparison, workingComparisonType = isStart ? "StartToStart" : "StartToEnd";
        var previousNode, nextNode, boundaryPosition, boundaryNode;
        var start = startInfo && startInfo.containerElement == containerElement ? startInfo.nodeIndex : 0;
        var childNodeCount = containerElement.childNodes.length;
        var end = childNodeCount;
        var nodeIndex = end;
        while (true) {
          if (nodeIndex == childNodeCount) {
            containerElement.appendChild(workingNode);
          } else {
            containerElement.insertBefore(workingNode, containerElement.childNodes[nodeIndex]);
          }
          workingRange.moveToElementText(workingNode);
          comparison = workingRange.compareEndPoints(workingComparisonType, textRange);
          if (comparison == 0 || start == end) {
            break;
          } else {
            if (comparison == -1) {
              if (end == start + 1) {
                break;
              } else {
                start = nodeIndex;
              }
            } else {
              end = end == start + 1 ? start : nodeIndex;
            }
          }
          nodeIndex = Math.floor((start + end) / 2);
          containerElement.removeChild(workingNode);
        }
        boundaryNode = workingNode.nextSibling;
        if (comparison == -1 && boundaryNode && isCharacterDataNode(boundaryNode)) {
          workingRange.setEndPoint(isStart ? "EndToStart" : "EndToEnd", textRange);
          var offset;
          if (/[\r\n]/.test(boundaryNode.data)) {
            var tempRange = workingRange.duplicate();
            var rangeLength = tempRange.text.replace(/\r\n/g, "\r").length;
            offset = tempRange.moveStart("character", rangeLength);
            while ((comparison = tempRange.compareEndPoints("StartToEnd", tempRange)) == -1) {
              offset++;
              tempRange.moveStart("character", 1);
            }
          } else {
            offset = workingRange.text.length;
          }
          boundaryPosition = new DomPosition(boundaryNode, offset);
        } else {
          previousNode = (isCollapsed || !isStart) && workingNode.previousSibling;
          nextNode = (isCollapsed || isStart) && workingNode.nextSibling;
          if (nextNode && isCharacterDataNode(nextNode)) {
            boundaryPosition = new DomPosition(nextNode, 0);
          } else {
            if (previousNode && isCharacterDataNode(previousNode)) {
              boundaryPosition = new DomPosition(previousNode, previousNode.data.length);
            } else {
              boundaryPosition = new DomPosition(containerElement, dom.getNodeIndex(workingNode));
            }
          }
        }
        workingNode.parentNode.removeChild(workingNode);
        return{boundaryPosition:boundaryPosition, nodeInfo:{nodeIndex:nodeIndex, containerElement:containerElement}};
      };
      var createBoundaryTextRange = function(boundaryPosition, isStart) {
        var boundaryNode, boundaryParent, boundaryOffset = boundaryPosition.offset;
        var doc = dom.getDocument(boundaryPosition.node);
        var workingNode, childNodes, workingRange = getBody(doc).createTextRange();
        var nodeIsDataNode = isCharacterDataNode(boundaryPosition.node);
        if (nodeIsDataNode) {
          boundaryNode = boundaryPosition.node;
          boundaryParent = boundaryNode.parentNode;
        } else {
          childNodes = boundaryPosition.node.childNodes;
          boundaryNode = boundaryOffset < childNodes.length ? childNodes[boundaryOffset] : null;
          boundaryParent = boundaryPosition.node;
        }
        workingNode = doc.createElement("span");
        workingNode.innerHTML = "&#feff;";
        if (boundaryNode) {
          boundaryParent.insertBefore(workingNode, boundaryNode);
        } else {
          boundaryParent.appendChild(workingNode);
        }
        workingRange.moveToElementText(workingNode);
        workingRange.collapse(!isStart);
        boundaryParent.removeChild(workingNode);
        if (nodeIsDataNode) {
          workingRange[isStart ? "moveStart" : "moveEnd"]("character", boundaryOffset);
        }
        return workingRange;
      };
      WrappedTextRange = function(textRange) {
        this.textRange = textRange;
        this.refresh();
      };
      WrappedTextRange.prototype = new DomRange(document);
      WrappedTextRange.prototype.refresh = function() {
        var start, end, startBoundary;
        var rangeContainerElement = getTextRangeContainerElement(this.textRange);
        if (textRangeIsCollapsed(this.textRange)) {
          end = start = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, true).boundaryPosition;
        } else {
          startBoundary = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, true, false);
          start = startBoundary.boundaryPosition;
          end = getTextRangeBoundaryPosition(this.textRange, rangeContainerElement, false, false, startBoundary.nodeInfo).boundaryPosition;
        }
        this.setStart(start.node, start.offset);
        this.setEnd(end.node, end.offset);
      };
      WrappedTextRange.prototype.getName = function() {
        return "WrappedTextRange";
      };
      DomRange.copyComparisonConstants(WrappedTextRange);
      var rangeToTextRange = function(range) {
        if (range.collapsed) {
          return createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
        } else {
          var startRange = createBoundaryTextRange(new DomPosition(range.startContainer, range.startOffset), true);
          var endRange = createBoundaryTextRange(new DomPosition(range.endContainer, range.endOffset), false);
          var textRange = getBody(DomRange.getRangeDocument(range)).createTextRange();
          textRange.setEndPoint("StartToStart", startRange);
          textRange.setEndPoint("EndToEnd", endRange);
          return textRange;
        }
      };
      WrappedTextRange.rangeToTextRange = rangeToTextRange;
      WrappedTextRange.prototype.toTextRange = function() {
        return rangeToTextRange(this);
      };
      api.WrappedTextRange = WrappedTextRange;
      if (!api.features.implementsDomRange || api.config.preferTextRange) {
        var globalObj = function(f) {
          return f("return this;")();
        }(Function);
        if (typeof globalObj.Range == "undefined") {
          globalObj.Range = WrappedTextRange;
        }
        api.createNativeRange = function(doc) {
          doc = getContentDocument(doc, module, "createNativeRange");
          return getBody(doc).createTextRange();
        };
        api.WrappedRange = WrappedTextRange;
      }
    }
    api.createRange = function(doc) {
      doc = getContentDocument(doc, module, "createRange");
      return new api.WrappedRange(api.createNativeRange(doc));
    };
    api.createRangyRange = function(doc) {
      doc = getContentDocument(doc, module, "createRangyRange");
      return new DomRange(doc);
    };
    api.createIframeRange = function(iframeEl) {
      module.deprecationNotice("createIframeRange()", "createRange(iframeEl)");
      return api.createRange(iframeEl);
    };
    api.createIframeRangyRange = function(iframeEl) {
      module.deprecationNotice("createIframeRangyRange()", "createRangyRange(iframeEl)");
      return api.createRangyRange(iframeEl);
    };
    api.addShimListener(function(win) {
      var doc = win.document;
      if (typeof doc.createRange == "undefined") {
        doc.createRange = function() {
          return api.createRange(doc);
        };
      }
      doc = win = null;
    });
  });
  api.createCoreModule("WrappedSelection", ["DomRange", "WrappedRange"], function(api, module) {
    api.config.checkSelectionRanges = true;
    var BOOLEAN = "boolean";
    var NUMBER = "number";
    var dom = api.dom;
    var util = api.util;
    var isHostMethod = util.isHostMethod;
    var DomRange = api.DomRange;
    var WrappedRange = api.WrappedRange;
    var DOMException = api.DOMException;
    var DomPosition = dom.DomPosition;
    var getNativeSelection;
    var selectionIsCollapsed;
    var features = api.features;
    var CONTROL = "Control";
    var getDocument = dom.getDocument;
    var getBody = dom.getBody;
    var rangesEqual = DomRange.rangesEqual;
    function isDirectionBackward(dir) {
      return typeof dir == "string" ? /^backward(s)?$/i.test(dir) : !!dir;
    }
    function getWindow(win, methodName) {
      if (!win) {
        return window;
      } else {
        if (dom.isWindow(win)) {
          return win;
        } else {
          if (win instanceof WrappedSelection) {
            return win.win;
          } else {
            var doc = dom.getContentDocument(win, module, methodName);
            return dom.getWindow(doc);
          }
        }
      }
    }
    function getWinSelection(winParam) {
      return getWindow(winParam, "getWinSelection").getSelection();
    }
    function getDocSelection(winParam) {
      return getWindow(winParam, "getDocSelection").document.selection;
    }
    function winSelectionIsBackward(sel) {
      var backward = false;
      if (sel.anchorNode) {
        backward = dom.comparePoints(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset) == 1;
      }
      return backward;
    }
    var implementsWinGetSelection = isHostMethod(window, "getSelection"), implementsDocSelection = util.isHostObject(document, "selection");
    features.implementsWinGetSelection = implementsWinGetSelection;
    features.implementsDocSelection = implementsDocSelection;
    var useDocumentSelection = implementsDocSelection && (!implementsWinGetSelection || api.config.preferTextRange);
    if (useDocumentSelection) {
      getNativeSelection = getDocSelection;
      api.isSelectionValid = function(winParam) {
        var doc = getWindow(winParam, "isSelectionValid").document, nativeSel = doc.selection;
        return nativeSel.type != "None" || getDocument(nativeSel.createRange().parentElement()) == doc;
      };
    } else {
      if (implementsWinGetSelection) {
        getNativeSelection = getWinSelection;
        api.isSelectionValid = function() {
          return true;
        };
      } else {
        module.fail("Neither document.selection or window.getSelection() detected.");
      }
    }
    api.getNativeSelection = getNativeSelection;
    var testSelection = getNativeSelection();
    var testRange = api.createNativeRange(document);
    var body = getBody(document);
    var selectionHasAnchorAndFocus = util.areHostProperties(testSelection, ["anchorNode", "focusNode", "anchorOffset", "focusOffset"]);
    features.selectionHasAnchorAndFocus = selectionHasAnchorAndFocus;
    var selectionHasExtend = isHostMethod(testSelection, "extend");
    features.selectionHasExtend = selectionHasExtend;
    var selectionHasRangeCount = typeof testSelection.rangeCount == NUMBER;
    features.selectionHasRangeCount = selectionHasRangeCount;
    var selectionSupportsMultipleRanges = false;
    var collapsedNonEditableSelectionsSupported = true;
    var addRangeBackwardToNative = selectionHasExtend ? function(nativeSelection, range) {
      var doc = DomRange.getRangeDocument(range);
      var endRange = api.createRange(doc);
      endRange.collapseToPoint(range.endContainer, range.endOffset);
      nativeSelection.addRange(getNativeRange(endRange));
      nativeSelection.extend(range.startContainer, range.startOffset);
    } : null;
    if (util.areHostMethods(testSelection, ["addRange", "getRangeAt", "removeAllRanges"]) && typeof testSelection.rangeCount == NUMBER && features.implementsDomRange) {
      (function() {
        var sel = window.getSelection();
        if (sel) {
          var originalSelectionRangeCount = sel.rangeCount;
          var selectionHasMultipleRanges = originalSelectionRangeCount > 1;
          var originalSelectionRanges = [];
          var originalSelectionBackward = winSelectionIsBackward(sel);
          for (var i = 0;i < originalSelectionRangeCount;++i) {
            originalSelectionRanges[i] = sel.getRangeAt(i);
          }
          var body = getBody(document);
          var testEl = body.appendChild(document.createElement("div"));
          testEl.contentEditable = "false";
          var textNode = testEl.appendChild(document.createTextNode("\u00a0\u00a0\u00a0"));
          var r1 = document.createRange();
          r1.setStart(textNode, 1);
          r1.collapse(true);
          sel.addRange(r1);
          collapsedNonEditableSelectionsSupported = sel.rangeCount == 1;
          sel.removeAllRanges();
          if (!selectionHasMultipleRanges) {
            var chromeMatch = window.navigator.appVersion.match(/Chrome\/(.*?) /);
            if (chromeMatch && parseInt(chromeMatch[1]) >= 36) {
              selectionSupportsMultipleRanges = false;
            } else {
              var r2 = r1.cloneRange();
              r1.setStart(textNode, 0);
              r2.setEnd(textNode, 3);
              r2.setStart(textNode, 2);
              sel.addRange(r1);
              sel.addRange(r2);
              selectionSupportsMultipleRanges = sel.rangeCount == 2;
            }
          }
          body.removeChild(testEl);
          sel.removeAllRanges();
          for (i = 0;i < originalSelectionRangeCount;++i) {
            if (i == 0 && originalSelectionBackward) {
              if (addRangeBackwardToNative) {
                addRangeBackwardToNative(sel, originalSelectionRanges[i]);
              } else {
                api.warn("Rangy initialization: original selection was backwards but selection has been restored forwards because the browser does not support Selection.extend");
                sel.addRange(originalSelectionRanges[i]);
              }
            } else {
              sel.addRange(originalSelectionRanges[i]);
            }
          }
        }
      })();
    }
    features.selectionSupportsMultipleRanges = selectionSupportsMultipleRanges;
    features.collapsedNonEditableSelectionsSupported = collapsedNonEditableSelectionsSupported;
    var implementsControlRange = false, testControlRange;
    if (body && isHostMethod(body, "createControlRange")) {
      testControlRange = body.createControlRange();
      if (util.areHostProperties(testControlRange, ["item", "add"])) {
        implementsControlRange = true;
      }
    }
    features.implementsControlRange = implementsControlRange;
    if (selectionHasAnchorAndFocus) {
      selectionIsCollapsed = function(sel) {
        return sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset;
      };
    } else {
      selectionIsCollapsed = function(sel) {
        return sel.rangeCount ? sel.getRangeAt(sel.rangeCount - 1).collapsed : false;
      };
    }
    function updateAnchorAndFocusFromRange(sel, range, backward) {
      var anchorPrefix = backward ? "end" : "start", focusPrefix = backward ? "start" : "end";
      sel.anchorNode = range[anchorPrefix + "Container"];
      sel.anchorOffset = range[anchorPrefix + "Offset"];
      sel.focusNode = range[focusPrefix + "Container"];
      sel.focusOffset = range[focusPrefix + "Offset"];
    }
    function updateAnchorAndFocusFromNativeSelection(sel) {
      var nativeSel = sel.nativeSelection;
      sel.anchorNode = nativeSel.anchorNode;
      sel.anchorOffset = nativeSel.anchorOffset;
      sel.focusNode = nativeSel.focusNode;
      sel.focusOffset = nativeSel.focusOffset;
    }
    function updateEmptySelection(sel) {
      sel.anchorNode = sel.focusNode = null;
      sel.anchorOffset = sel.focusOffset = 0;
      sel.rangeCount = 0;
      sel.isCollapsed = true;
      sel._ranges.length = 0;
    }
    function getNativeRange(range) {
      var nativeRange;
      if (range instanceof DomRange) {
        nativeRange = api.createNativeRange(range.getDocument());
        nativeRange.setEnd(range.endContainer, range.endOffset);
        nativeRange.setStart(range.startContainer, range.startOffset);
      } else {
        if (range instanceof WrappedRange) {
          nativeRange = range.nativeRange;
        } else {
          if (features.implementsDomRange && range instanceof dom.getWindow(range.startContainer).Range) {
            nativeRange = range;
          }
        }
      }
      return nativeRange;
    }
    function rangeContainsSingleElement(rangeNodes) {
      if (!rangeNodes.length || rangeNodes[0].nodeType != 1) {
        return false;
      }
      for (var i = 1, len = rangeNodes.length;i < len;++i) {
        if (!dom.isAncestorOf(rangeNodes[0], rangeNodes[i])) {
          return false;
        }
      }
      return true;
    }
    function getSingleElementFromRange(range) {
      var nodes = range.getNodes();
      if (!rangeContainsSingleElement(nodes)) {
        throw module.createError("getSingleElementFromRange: range " + range.inspect() + " did not consist of a single element");
      }
      return nodes[0];
    }
    function isTextRange(range) {
      return!!range && typeof range.text != "undefined";
    }
    function updateFromTextRange(sel, range) {
      var wrappedRange = new WrappedRange(range);
      sel._ranges = [wrappedRange];
      updateAnchorAndFocusFromRange(sel, wrappedRange, false);
      sel.rangeCount = 1;
      sel.isCollapsed = wrappedRange.collapsed;
    }
    function updateControlSelection(sel) {
      sel._ranges.length = 0;
      if (sel.docSelection.type == "None") {
        updateEmptySelection(sel);
      } else {
        var controlRange = sel.docSelection.createRange();
        if (isTextRange(controlRange)) {
          updateFromTextRange(sel, controlRange);
        } else {
          sel.rangeCount = controlRange.length;
          var range, doc = getDocument(controlRange.item(0));
          for (var i = 0;i < sel.rangeCount;++i) {
            range = api.createRange(doc);
            range.selectNode(controlRange.item(i));
            sel._ranges.push(range);
          }
          sel.isCollapsed = sel.rangeCount == 1 && sel._ranges[0].collapsed;
          updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
        }
      }
    }
    function addRangeToControlSelection(sel, range) {
      var controlRange = sel.docSelection.createRange();
      var rangeElement = getSingleElementFromRange(range);
      var doc = getDocument(controlRange.item(0));
      var newControlRange = getBody(doc).createControlRange();
      for (var i = 0, len = controlRange.length;i < len;++i) {
        newControlRange.add(controlRange.item(i));
      }
      try {
        newControlRange.add(rangeElement);
      } catch (ex) {
        throw module.createError("addRange(): Element within the specified Range could not be added to control selection (does it have layout?)");
      }
      newControlRange.select();
      updateControlSelection(sel);
    }
    var getSelectionRangeAt;
    if (isHostMethod(testSelection, "getRangeAt")) {
      getSelectionRangeAt = function(sel, index) {
        try {
          return sel.getRangeAt(index);
        } catch (ex) {
          return null;
        }
      };
    } else {
      if (selectionHasAnchorAndFocus) {
        getSelectionRangeAt = function(sel) {
          var doc = getDocument(sel.anchorNode);
          var range = api.createRange(doc);
          range.setStartAndEnd(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
          if (range.collapsed !== this.isCollapsed) {
            range.setStartAndEnd(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset);
          }
          return range;
        };
      }
    }
    function WrappedSelection(selection, docSelection, win) {
      this.nativeSelection = selection;
      this.docSelection = docSelection;
      this._ranges = [];
      this.win = win;
      this.refresh();
    }
    WrappedSelection.prototype = api.selectionPrototype;
    function deleteProperties(sel) {
      sel.win = sel.anchorNode = sel.focusNode = sel._ranges = null;
      sel.rangeCount = sel.anchorOffset = sel.focusOffset = 0;
      sel.detached = true;
    }
    var cachedRangySelections = [];
    function actOnCachedSelection(win, action) {
      var i = cachedRangySelections.length, cached, sel;
      while (i--) {
        cached = cachedRangySelections[i];
        sel = cached.selection;
        if (action == "deleteAll") {
          deleteProperties(sel);
        } else {
          if (cached.win == win) {
            if (action == "delete") {
              cachedRangySelections.splice(i, 1);
              return true;
            } else {
              return sel;
            }
          }
        }
      }
      if (action == "deleteAll") {
        cachedRangySelections.length = 0;
      }
      return null;
    }
    var getSelection = function(win) {
      if (win && win instanceof WrappedSelection) {
        win.refresh();
        return win;
      }
      win = getWindow(win, "getNativeSelection");
      var sel = actOnCachedSelection(win);
      var nativeSel = getNativeSelection(win), docSel = implementsDocSelection ? getDocSelection(win) : null;
      if (sel) {
        sel.nativeSelection = nativeSel;
        sel.docSelection = docSel;
        sel.refresh();
      } else {
        sel = new WrappedSelection(nativeSel, docSel, win);
        cachedRangySelections.push({win:win, selection:sel});
      }
      return sel;
    };
    api.getSelection = getSelection;
    api.getIframeSelection = function(iframeEl) {
      module.deprecationNotice("getIframeSelection()", "getSelection(iframeEl)");
      return api.getSelection(dom.getIframeWindow(iframeEl));
    };
    var selProto = WrappedSelection.prototype;
    function createControlSelection(sel, ranges) {
      var doc = getDocument(ranges[0].startContainer);
      var controlRange = getBody(doc).createControlRange();
      for (var i = 0, el, len = ranges.length;i < len;++i) {
        el = getSingleElementFromRange(ranges[i]);
        try {
          controlRange.add(el);
        } catch (ex) {
          throw module.createError("setRanges(): Element within one of the specified Ranges could not be added to control selection (does it have layout?)");
        }
      }
      controlRange.select();
      updateControlSelection(sel);
    }
    if (!useDocumentSelection && selectionHasAnchorAndFocus && util.areHostMethods(testSelection, ["removeAllRanges", "addRange"])) {
      selProto.removeAllRanges = function() {
        this.nativeSelection.removeAllRanges();
        updateEmptySelection(this);
      };
      var addRangeBackward = function(sel, range) {
        addRangeBackwardToNative(sel.nativeSelection, range);
        sel.refresh();
      };
      if (selectionHasRangeCount) {
        selProto.addRange = function(range, direction) {
          if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
            addRangeToControlSelection(this, range);
          } else {
            if (isDirectionBackward(direction) && selectionHasExtend) {
              addRangeBackward(this, range);
            } else {
              var previousRangeCount;
              if (selectionSupportsMultipleRanges) {
                previousRangeCount = this.rangeCount;
              } else {
                this.removeAllRanges();
                previousRangeCount = 0;
              }
              var clonedNativeRange = getNativeRange(range).cloneRange();
              try {
                this.nativeSelection.addRange(clonedNativeRange);
              } catch (ex) {
              }
              this.rangeCount = this.nativeSelection.rangeCount;
              if (this.rangeCount == previousRangeCount + 1) {
                if (api.config.checkSelectionRanges) {
                  var nativeRange = getSelectionRangeAt(this.nativeSelection, this.rangeCount - 1);
                  if (nativeRange && !rangesEqual(nativeRange, range)) {
                    range = new WrappedRange(nativeRange);
                  }
                }
                this._ranges[this.rangeCount - 1] = range;
                updateAnchorAndFocusFromRange(this, range, selectionIsBackward(this.nativeSelection));
                this.isCollapsed = selectionIsCollapsed(this);
              } else {
                this.refresh();
              }
            }
          }
        };
      } else {
        selProto.addRange = function(range, direction) {
          if (isDirectionBackward(direction) && selectionHasExtend) {
            addRangeBackward(this, range);
          } else {
            this.nativeSelection.addRange(getNativeRange(range));
            this.refresh();
          }
        };
      }
      selProto.setRanges = function(ranges) {
        if (implementsControlRange && implementsDocSelection && ranges.length > 1) {
          createControlSelection(this, ranges);
        } else {
          this.removeAllRanges();
          for (var i = 0, len = ranges.length;i < len;++i) {
            this.addRange(ranges[i]);
          }
        }
      };
    } else {
      if (isHostMethod(testSelection, "empty") && isHostMethod(testRange, "select") && implementsControlRange && useDocumentSelection) {
        selProto.removeAllRanges = function() {
          try {
            this.docSelection.empty();
            if (this.docSelection.type != "None") {
              var doc;
              if (this.anchorNode) {
                doc = getDocument(this.anchorNode);
              } else {
                if (this.docSelection.type == CONTROL) {
                  var controlRange = this.docSelection.createRange();
                  if (controlRange.length) {
                    doc = getDocument(controlRange.item(0));
                  }
                }
              }
              if (doc) {
                var textRange = getBody(doc).createTextRange();
                textRange.select();
                this.docSelection.empty();
              }
            }
          } catch (ex) {
          }
          updateEmptySelection(this);
        };
        selProto.addRange = function(range) {
          if (this.docSelection.type == CONTROL) {
            addRangeToControlSelection(this, range);
          } else {
            api.WrappedTextRange.rangeToTextRange(range).select();
            this._ranges[0] = range;
            this.rangeCount = 1;
            this.isCollapsed = this._ranges[0].collapsed;
            updateAnchorAndFocusFromRange(this, range, false);
          }
        };
        selProto.setRanges = function(ranges) {
          this.removeAllRanges();
          var rangeCount = ranges.length;
          if (rangeCount > 1) {
            createControlSelection(this, ranges);
          } else {
            if (rangeCount) {
              this.addRange(ranges[0]);
            }
          }
        };
      } else {
        module.fail("No means of selecting a Range or TextRange was found");
        return false;
      }
    }
    selProto.getRangeAt = function(index) {
      if (index < 0 || index >= this.rangeCount) {
        throw new DOMException("INDEX_SIZE_ERR");
      } else {
        return this._ranges[index].cloneRange();
      }
    };
    var refreshSelection;
    if (useDocumentSelection) {
      refreshSelection = function(sel) {
        var range;
        if (api.isSelectionValid(sel.win)) {
          range = sel.docSelection.createRange();
        } else {
          range = getBody(sel.win.document).createTextRange();
          range.collapse(true);
        }
        if (sel.docSelection.type == CONTROL) {
          updateControlSelection(sel);
        } else {
          if (isTextRange(range)) {
            updateFromTextRange(sel, range);
          } else {
            updateEmptySelection(sel);
          }
        }
      };
    } else {
      if (isHostMethod(testSelection, "getRangeAt") && typeof testSelection.rangeCount == NUMBER) {
        refreshSelection = function(sel) {
          if (implementsControlRange && implementsDocSelection && sel.docSelection.type == CONTROL) {
            updateControlSelection(sel);
          } else {
            sel._ranges.length = sel.rangeCount = sel.nativeSelection.rangeCount;
            if (sel.rangeCount) {
              for (var i = 0, len = sel.rangeCount;i < len;++i) {
                sel._ranges[i] = new api.WrappedRange(sel.nativeSelection.getRangeAt(i));
              }
              updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], selectionIsBackward(sel.nativeSelection));
              sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
              updateEmptySelection(sel);
            }
          }
        };
      } else {
        if (selectionHasAnchorAndFocus && typeof testSelection.isCollapsed == BOOLEAN && typeof testRange.collapsed == BOOLEAN && features.implementsDomRange) {
          refreshSelection = function(sel) {
            var range, nativeSel = sel.nativeSelection;
            if (nativeSel.anchorNode) {
              range = getSelectionRangeAt(nativeSel, 0);
              sel._ranges = [range];
              sel.rangeCount = 1;
              updateAnchorAndFocusFromNativeSelection(sel);
              sel.isCollapsed = selectionIsCollapsed(sel);
            } else {
              updateEmptySelection(sel);
            }
          };
        } else {
          module.fail("No means of obtaining a Range or TextRange from the user's selection was found");
          return false;
        }
      }
    }
    selProto.refresh = function(checkForChanges) {
      var oldRanges = checkForChanges ? this._ranges.slice(0) : null;
      var oldAnchorNode = this.anchorNode, oldAnchorOffset = this.anchorOffset;
      refreshSelection(this);
      if (checkForChanges) {
        var i = oldRanges.length;
        if (i != this._ranges.length) {
          return true;
        }
        if (this.anchorNode != oldAnchorNode || this.anchorOffset != oldAnchorOffset) {
          return true;
        }
        while (i--) {
          if (!rangesEqual(oldRanges[i], this._ranges[i])) {
            return true;
          }
        }
        return false;
      }
    };
    var removeRangeManually = function(sel, range) {
      var ranges = sel.getAllRanges();
      sel.removeAllRanges();
      for (var i = 0, len = ranges.length;i < len;++i) {
        if (!rangesEqual(range, ranges[i])) {
          sel.addRange(ranges[i]);
        }
      }
      if (!sel.rangeCount) {
        updateEmptySelection(sel);
      }
    };
    if (implementsControlRange && implementsDocSelection) {
      selProto.removeRange = function(range) {
        if (this.docSelection.type == CONTROL) {
          var controlRange = this.docSelection.createRange();
          var rangeElement = getSingleElementFromRange(range);
          var doc = getDocument(controlRange.item(0));
          var newControlRange = getBody(doc).createControlRange();
          var el, removed = false;
          for (var i = 0, len = controlRange.length;i < len;++i) {
            el = controlRange.item(i);
            if (el !== rangeElement || removed) {
              newControlRange.add(controlRange.item(i));
            } else {
              removed = true;
            }
          }
          newControlRange.select();
          updateControlSelection(this);
        } else {
          removeRangeManually(this, range);
        }
      };
    } else {
      selProto.removeRange = function(range) {
        removeRangeManually(this, range);
      };
    }
    var selectionIsBackward;
    if (!useDocumentSelection && selectionHasAnchorAndFocus && features.implementsDomRange) {
      selectionIsBackward = winSelectionIsBackward;
      selProto.isBackward = function() {
        return selectionIsBackward(this);
      };
    } else {
      selectionIsBackward = selProto.isBackward = function() {
        return false;
      };
    }
    selProto.isBackwards = selProto.isBackward;
    selProto.toString = function() {
      var rangeTexts = [];
      for (var i = 0, len = this.rangeCount;i < len;++i) {
        rangeTexts[i] = "" + this._ranges[i];
      }
      return rangeTexts.join("");
    };
    function assertNodeInSameDocument(sel, node) {
      if (sel.win.document != getDocument(node)) {
        throw new DOMException("WRONG_DOCUMENT_ERR");
      }
    }
    selProto.collapse = function(node, offset) {
      assertNodeInSameDocument(this, node);
      var range = api.createRange(node);
      range.collapseToPoint(node, offset);
      this.setSingleRange(range);
      this.isCollapsed = true;
    };
    selProto.collapseToStart = function() {
      if (this.rangeCount) {
        var range = this._ranges[0];
        this.collapse(range.startContainer, range.startOffset);
      } else {
        throw new DOMException("INVALID_STATE_ERR");
      }
    };
    selProto.collapseToEnd = function() {
      if (this.rangeCount) {
        var range = this._ranges[this.rangeCount - 1];
        this.collapse(range.endContainer, range.endOffset);
      } else {
        throw new DOMException("INVALID_STATE_ERR");
      }
    };
    selProto.selectAllChildren = function(node) {
      assertNodeInSameDocument(this, node);
      var range = api.createRange(node);
      range.selectNodeContents(node);
      this.setSingleRange(range);
    };
    selProto.deleteFromDocument = function() {
      if (implementsControlRange && implementsDocSelection && this.docSelection.type == CONTROL) {
        var controlRange = this.docSelection.createRange();
        var element;
        while (controlRange.length) {
          element = controlRange.item(0);
          controlRange.remove(element);
          element.parentNode.removeChild(element);
        }
        this.refresh();
      } else {
        if (this.rangeCount) {
          var ranges = this.getAllRanges();
          if (ranges.length) {
            this.removeAllRanges();
            for (var i = 0, len = ranges.length;i < len;++i) {
              ranges[i].deleteContents();
            }
            this.addRange(ranges[len - 1]);
          }
        }
      }
    };
    selProto.eachRange = function(func, returnValue) {
      for (var i = 0, len = this._ranges.length;i < len;++i) {
        if (func(this.getRangeAt(i))) {
          return returnValue;
        }
      }
    };
    selProto.getAllRanges = function() {
      var ranges = [];
      this.eachRange(function(range) {
        ranges.push(range);
      });
      return ranges;
    };
    selProto.setSingleRange = function(range, direction) {
      this.removeAllRanges();
      this.addRange(range, direction);
    };
    selProto.callMethodOnEachRange = function(methodName, params) {
      var results = [];
      this.eachRange(function(range) {
        results.push(range[methodName].apply(range, params));
      });
      return results;
    };
    function createStartOrEndSetter(isStart) {
      return function(node, offset) {
        var range;
        if (this.rangeCount) {
          range = this.getRangeAt(0);
          range["set" + (isStart ? "Start" : "End")](node, offset);
        } else {
          range = api.createRange(this.win.document);
          range.setStartAndEnd(node, offset);
        }
        this.setSingleRange(range, this.isBackward());
      };
    }
    selProto.setStart = createStartOrEndSetter(true);
    selProto.setEnd = createStartOrEndSetter(false);
    api.rangePrototype.select = function(direction) {
      getSelection(this.getDocument()).setSingleRange(this, direction);
    };
    selProto.changeEachRange = function(func) {
      var ranges = [];
      var backward = this.isBackward();
      this.eachRange(function(range) {
        func(range);
        ranges.push(range);
      });
      this.removeAllRanges();
      if (backward && ranges.length == 1) {
        this.addRange(ranges[0], "backward");
      } else {
        this.setRanges(ranges);
      }
    };
    selProto.containsNode = function(node, allowPartial) {
      return this.eachRange(function(range) {
        return range.containsNode(node, allowPartial);
      }, true) || false;
    };
    selProto.getBookmark = function(containerNode) {
      return{backward:this.isBackward(), rangeBookmarks:this.callMethodOnEachRange("getBookmark", [containerNode])};
    };
    selProto.moveToBookmark = function(bookmark) {
      var selRanges = [];
      for (var i = 0, rangeBookmark, range;rangeBookmark = bookmark.rangeBookmarks[i++];) {
        range = api.createRange(this.win);
        range.moveToBookmark(rangeBookmark);
        selRanges.push(range);
      }
      if (bookmark.backward) {
        this.setSingleRange(selRanges[0], "backward");
      } else {
        this.setRanges(selRanges);
      }
    };
    selProto.toHtml = function() {
      var rangeHtmls = [];
      this.eachRange(function(range) {
        rangeHtmls.push(DomRange.toHtml(range));
      });
      return rangeHtmls.join("");
    };
    if (features.implementsTextRange) {
      selProto.getNativeTextRange = function() {
        var sel, textRange;
        if (sel = this.docSelection) {
          var range = sel.createRange();
          if (isTextRange(range)) {
            return range;
          } else {
            throw module.createError("getNativeTextRange: selection is a control selection");
          }
        } else {
          if (this.rangeCount > 0) {
            return api.WrappedTextRange.rangeToTextRange(this.getRangeAt(0));
          } else {
            throw module.createError("getNativeTextRange: selection contains no range");
          }
        }
      };
    }
    function inspect(sel) {
      var rangeInspects = [];
      var anchor = new DomPosition(sel.anchorNode, sel.anchorOffset);
      var focus = new DomPosition(sel.focusNode, sel.focusOffset);
      var name = typeof sel.getName == "function" ? sel.getName() : "Selection";
      if (typeof sel.rangeCount != "undefined") {
        for (var i = 0, len = sel.rangeCount;i < len;++i) {
          rangeInspects[i] = DomRange.inspect(sel.getRangeAt(i));
        }
      }
      return "[" + name + "(Ranges: " + rangeInspects.join(", ") + ")(anchor: " + anchor.inspect() + ", focus: " + focus.inspect() + "]";
    }
    selProto.getName = function() {
      return "WrappedSelection";
    };
    selProto.inspect = function() {
      return inspect(this);
    };
    selProto.detach = function() {
      actOnCachedSelection(this.win, "delete");
      deleteProperties(this);
    };
    WrappedSelection.detachAll = function() {
      actOnCachedSelection(null, "deleteAll");
    };
    WrappedSelection.inspect = inspect;
    WrappedSelection.isDirectionBackward = isDirectionBackward;
    api.Selection = WrappedSelection;
    api.selectionPrototype = selProto;
    api.addShimListener(function(win) {
      if (typeof win.getSelection == "undefined") {
        win.getSelection = function() {
          return getSelection(win);
        };
      }
      win = null;
    });
  });
  var docReady = false;
  var loadHandler = function(e) {
    if (!docReady) {
      docReady = true;
      if (!api.initialized && api.config.autoInitialize) {
        init();
      }
    }
  };
  if (isBrowser) {
    if (document.readyState == "complete") {
      loadHandler();
    } else {
      if (isHostMethod(document, "addEventListener")) {
        document.addEventListener("DOMContentLoaded", loadHandler, false);
      }
      addListener(window, "load", loadHandler);
    }
  }
  return api;
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("ClassApplier", ["WrappedSelection"], function(api, module) {
    var dom = api.dom;
    var DomPosition = dom.DomPosition;
    var contains = dom.arrayContains;
    var isHtmlNamespace = dom.isHtmlNamespace;
    var defaultTagName = "span";
    function each(obj, func) {
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (func(i, obj[i]) === false) {
            return false;
          }
        }
      }
      return true;
    }
    function trim(str) {
      return str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
    }
    function hasClass(el, className) {
      return el.className && (new RegExp("(?:^|\\s)" + className + "(?:\\s|$)")).test(el.className);
    }
    function addClass(el, className) {
      if (el.className) {
        if (!hasClass(el, className)) {
          el.className += " " + className;
        }
      } else {
        el.className = className;
      }
    }
    var removeClass = function() {
      function replacer(matched, whiteSpaceBefore, whiteSpaceAfter) {
        return whiteSpaceBefore && whiteSpaceAfter ? " " : "";
      }
      return function(el, className) {
        if (el.className) {
          el.className = el.className.replace(new RegExp("(^|\\s)" + className + "(\\s|$)"), replacer);
        }
      };
    }();
    function sortClassName(className) {
      return className && className.split(/\s+/).sort().join(" ");
    }
    function getSortedClassName(el) {
      return sortClassName(el.className);
    }
    function haveSameClasses(el1, el2) {
      return getSortedClassName(el1) == getSortedClassName(el2);
    }
    function movePosition(position, oldParent, oldIndex, newParent, newIndex) {
      var posNode = position.node, posOffset = position.offset;
      var newNode = posNode, newOffset = posOffset;
      if (posNode == newParent && posOffset > newIndex) {
        ++newOffset;
      }
      if (posNode == oldParent && (posOffset == oldIndex || posOffset == oldIndex + 1)) {
        newNode = newParent;
        newOffset += newIndex - oldIndex;
      }
      if (posNode == oldParent && posOffset > oldIndex + 1) {
        --newOffset;
      }
      position.node = newNode;
      position.offset = newOffset;
    }
    function movePositionWhenRemovingNode(position, parentNode, index) {
      if (position.node == parentNode && position.offset > index) {
        --position.offset;
      }
    }
    function movePreservingPositions(node, newParent, newIndex, positionsToPreserve) {
      if (newIndex == -1) {
        newIndex = newParent.childNodes.length;
      }
      var oldParent = node.parentNode;
      var oldIndex = dom.getNodeIndex(node);
      for (var i = 0, position;position = positionsToPreserve[i++];) {
        movePosition(position, oldParent, oldIndex, newParent, newIndex);
      }
      if (newParent.childNodes.length == newIndex) {
        newParent.appendChild(node);
      } else {
        newParent.insertBefore(node, newParent.childNodes[newIndex]);
      }
    }
    function removePreservingPositions(node, positionsToPreserve) {
      var oldParent = node.parentNode;
      var oldIndex = dom.getNodeIndex(node);
      for (var i = 0, position;position = positionsToPreserve[i++];) {
        movePositionWhenRemovingNode(position, oldParent, oldIndex);
      }
      node.parentNode.removeChild(node);
    }
    function moveChildrenPreservingPositions(node, newParent, newIndex, removeNode, positionsToPreserve) {
      var child, children = [];
      while (child = node.firstChild) {
        movePreservingPositions(child, newParent, newIndex++, positionsToPreserve);
        children.push(child);
      }
      if (removeNode) {
        removePreservingPositions(node, positionsToPreserve);
      }
      return children;
    }
    function replaceWithOwnChildrenPreservingPositions(element, positionsToPreserve) {
      return moveChildrenPreservingPositions(element, element.parentNode, dom.getNodeIndex(element), true, positionsToPreserve);
    }
    function rangeSelectsAnyText(range, textNode) {
      var textNodeRange = range.cloneRange();
      textNodeRange.selectNodeContents(textNode);
      var intersectionRange = textNodeRange.intersection(range);
      var text = intersectionRange ? intersectionRange.toString() : "";
      return text != "";
    }
    function getEffectiveTextNodes(range) {
      var nodes = range.getNodes([3]);
      var start = 0, node;
      while ((node = nodes[start]) && !rangeSelectsAnyText(range, node)) {
        ++start;
      }
      var end = nodes.length - 1;
      while ((node = nodes[end]) && !rangeSelectsAnyText(range, node)) {
        --end;
      }
      return nodes.slice(start, end + 1);
    }
    function elementsHaveSameNonClassAttributes(el1, el2) {
      if (el1.attributes.length != el2.attributes.length) {
        return false;
      }
      for (var i = 0, len = el1.attributes.length, attr1, attr2, name;i < len;++i) {
        attr1 = el1.attributes[i];
        name = attr1.name;
        if (name != "class") {
          attr2 = el2.attributes.getNamedItem(name);
          if (attr1 === null != (attr2 === null)) {
            return false;
          }
          if (attr1.specified != attr2.specified) {
            return false;
          }
          if (attr1.specified && attr1.nodeValue !== attr2.nodeValue) {
            return false;
          }
        }
      }
      return true;
    }
    function elementHasNonClassAttributes(el, exceptions) {
      for (var i = 0, len = el.attributes.length, attrName;i < len;++i) {
        attrName = el.attributes[i].name;
        if (!(exceptions && contains(exceptions, attrName)) && el.attributes[i].specified && attrName != "class") {
          return true;
        }
      }
      return false;
    }
    function elementHasProperties(el, props) {
      return each(props, function(p, propValue) {
        if (typeof propValue == "object") {
          if (!elementHasProperties(el[p], propValue)) {
            return false;
          }
        } else {
          if (el[p] !== propValue) {
            return false;
          }
        }
      });
    }
    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var isEditableElement = function() {
      var testEl = document.createElement("div");
      return typeof testEl.isContentEditable == "boolean" ? function(node) {
        return node && node.nodeType == 1 && node.isContentEditable;
      } : function(node) {
        if (!node || node.nodeType != 1 || node.contentEditable == "false") {
          return false;
        }
        return node.contentEditable == "true" || isEditableElement(node.parentNode);
      };
    }();
    function isEditingHost(node) {
      var parent;
      return node && node.nodeType == 1 && ((parent = node.parentNode) && parent.nodeType == 9 && parent.designMode == "on" || isEditableElement(node) && !isEditableElement(node.parentNode));
    }
    function isEditable(node) {
      return(isEditableElement(node) || node.nodeType != 1 && isEditableElement(node.parentNode)) && !isEditingHost(node);
    }
    var inlineDisplayRegex = /^inline(-block|-table)?$/i;
    function isNonInlineElement(node) {
      return node && node.nodeType == 1 && !inlineDisplayRegex.test(getComputedStyleProperty(node, "display"));
    }
    var htmlNonWhiteSpaceRegex = /[^\r\n\t\f \u200B]/;
    function isUnrenderedWhiteSpaceNode(node) {
      if (node.data.length == 0) {
        return true;
      }
      if (htmlNonWhiteSpaceRegex.test(node.data)) {
        return false;
      }
      var cssWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
      switch(cssWhiteSpace) {
        case "pre":
        ;
        case "pre-wrap":
        ;
        case "-moz-pre-wrap":
          return false;
        case "pre-line":
          if (/[\r\n]/.test(node.data)) {
            return false;
          }
        ;
      }
      return isNonInlineElement(node.previousSibling) || isNonInlineElement(node.nextSibling);
    }
    function getRangeBoundaries(ranges) {
      var positions = [], i, range;
      for (i = 0;range = ranges[i++];) {
        positions.push(new DomPosition(range.startContainer, range.startOffset), new DomPosition(range.endContainer, range.endOffset));
      }
      return positions;
    }
    function updateRangesFromBoundaries(ranges, positions) {
      for (var i = 0, range, start, end, len = ranges.length;i < len;++i) {
        range = ranges[i];
        start = positions[i * 2];
        end = positions[i * 2 + 1];
        range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
      }
    }
    function isSplitPoint(node, offset) {
      if (dom.isCharacterDataNode(node)) {
        if (offset == 0) {
          return!!node.previousSibling;
        } else {
          if (offset == node.length) {
            return!!node.nextSibling;
          } else {
            return true;
          }
        }
      }
      return offset > 0 && offset < node.childNodes.length;
    }
    function splitNodeAt(node, descendantNode, descendantOffset, positionsToPreserve) {
      var newNode, parentNode;
      var splitAtStart = descendantOffset == 0;
      if (dom.isAncestorOf(descendantNode, node)) {
        return node;
      }
      if (dom.isCharacterDataNode(descendantNode)) {
        var descendantIndex = dom.getNodeIndex(descendantNode);
        if (descendantOffset == 0) {
          descendantOffset = descendantIndex;
        } else {
          if (descendantOffset == descendantNode.length) {
            descendantOffset = descendantIndex + 1;
          } else {
            throw module.createError("splitNodeAt() should not be called with offset in the middle of a data node (" + descendantOffset + " in " + descendantNode.data);
          }
        }
        descendantNode = descendantNode.parentNode;
      }
      if (isSplitPoint(descendantNode, descendantOffset)) {
        newNode = descendantNode.cloneNode(false);
        parentNode = descendantNode.parentNode;
        if (newNode.id) {
          newNode.removeAttribute("id");
        }
        var child, newChildIndex = 0;
        while (child = descendantNode.childNodes[descendantOffset]) {
          movePreservingPositions(child, newNode, newChildIndex++, positionsToPreserve);
        }
        movePreservingPositions(newNode, parentNode, dom.getNodeIndex(descendantNode) + 1, positionsToPreserve);
        return descendantNode == node ? newNode : splitNodeAt(node, parentNode, dom.getNodeIndex(newNode), positionsToPreserve);
      } else {
        if (node != descendantNode) {
          newNode = descendantNode.parentNode;
          var newNodeIndex = dom.getNodeIndex(descendantNode);
          if (!splitAtStart) {
            newNodeIndex++;
          }
          return splitNodeAt(node, newNode, newNodeIndex, positionsToPreserve);
        }
      }
      return node;
    }
    function areElementsMergeable(el1, el2) {
      return el1.namespaceURI == el2.namespaceURI && el1.tagName.toLowerCase() == el2.tagName.toLowerCase() && haveSameClasses(el1, el2) && elementsHaveSameNonClassAttributes(el1, el2) && getComputedStyleProperty(el1, "display") == "inline" && getComputedStyleProperty(el2, "display") == "inline";
    }
    function createAdjacentMergeableTextNodeGetter(forward) {
      var siblingPropName = forward ? "nextSibling" : "previousSibling";
      return function(textNode, checkParentElement) {
        var el = textNode.parentNode;
        var adjacentNode = textNode[siblingPropName];
        if (adjacentNode) {
          if (adjacentNode && adjacentNode.nodeType == 3) {
            return adjacentNode;
          }
        } else {
          if (checkParentElement) {
            adjacentNode = el[siblingPropName];
            if (adjacentNode && adjacentNode.nodeType == 1 && areElementsMergeable(el, adjacentNode)) {
              var adjacentNodeChild = adjacentNode[forward ? "firstChild" : "lastChild"];
              if (adjacentNodeChild && adjacentNodeChild.nodeType == 3) {
                return adjacentNodeChild;
              }
            }
          }
        }
        return null;
      };
    }
    var getPreviousMergeableTextNode = createAdjacentMergeableTextNodeGetter(false), getNextMergeableTextNode = createAdjacentMergeableTextNodeGetter(true);
    function Merge(firstNode) {
      this.isElementMerge = firstNode.nodeType == 1;
      this.textNodes = [];
      var firstTextNode = this.isElementMerge ? firstNode.lastChild : firstNode;
      if (firstTextNode) {
        this.textNodes[0] = firstTextNode;
      }
    }
    Merge.prototype = {doMerge:function(positionsToPreserve) {
      var textNodes = this.textNodes;
      var firstTextNode = textNodes[0];
      if (textNodes.length > 1) {
        var firstTextNodeIndex = dom.getNodeIndex(firstTextNode);
        var textParts = [], combinedTextLength = 0, textNode, parent;
        for (var i = 0, len = textNodes.length, j, position;i < len;++i) {
          textNode = textNodes[i];
          parent = textNode.parentNode;
          if (i > 0) {
            parent.removeChild(textNode);
            if (!parent.hasChildNodes()) {
              parent.parentNode.removeChild(parent);
            }
            if (positionsToPreserve) {
              for (j = 0;position = positionsToPreserve[j++];) {
                if (position.node == textNode) {
                  position.node = firstTextNode;
                  position.offset += combinedTextLength;
                }
                if (position.node == parent && position.offset > firstTextNodeIndex) {
                  --position.offset;
                  if (position.offset == firstTextNodeIndex + 1 && i < len - 1) {
                    position.node = firstTextNode;
                    position.offset = combinedTextLength;
                  }
                }
              }
            }
          }
          textParts[i] = textNode.data;
          combinedTextLength += textNode.data.length;
        }
        firstTextNode.data = textParts.join("");
      }
      return firstTextNode.data;
    }, getLength:function() {
      var i = this.textNodes.length, len = 0;
      while (i--) {
        len += this.textNodes[i].length;
      }
      return len;
    }, toString:function() {
      var textParts = [];
      for (var i = 0, len = this.textNodes.length;i < len;++i) {
        textParts[i] = "'" + this.textNodes[i].data + "'";
      }
      return "[Merge(" + textParts.join(",") + ")]";
    }};
    var optionProperties = ["elementTagName", "ignoreWhiteSpace", "applyToEditableOnly", "useExistingElements", "removeEmptyElements", "onElementCreate"];
    var attrNamesForProperties = {};
    function ClassApplier(className, options, tagNames) {
      var normalize, i, len, propName, applier = this;
      applier.cssClass = applier.className = className;
      var elementPropertiesFromOptions = null, elementAttributes = {};
      if (typeof options == "object" && options !== null) {
        tagNames = options.tagNames;
        elementPropertiesFromOptions = options.elementProperties;
        elementAttributes = options.elementAttributes;
        for (i = 0;propName = optionProperties[i++];) {
          if (options.hasOwnProperty(propName)) {
            applier[propName] = options[propName];
          }
        }
        normalize = options.normalize;
      } else {
        normalize = options;
      }
      applier.normalize = typeof normalize == "undefined" ? true : normalize;
      applier.attrExceptions = [];
      var el = document.createElement(applier.elementTagName);
      applier.elementProperties = applier.copyPropertiesToElement(elementPropertiesFromOptions, el, true);
      each(elementAttributes, function(attrName) {
        applier.attrExceptions.push(attrName);
      });
      applier.elementAttributes = elementAttributes;
      applier.elementSortedClassName = applier.elementProperties.hasOwnProperty("className") ? applier.elementProperties.className : className;
      applier.applyToAnyTagName = false;
      var type = typeof tagNames;
      if (type == "string") {
        if (tagNames == "*") {
          applier.applyToAnyTagName = true;
        } else {
          applier.tagNames = trim(tagNames.toLowerCase()).split(/\s*,\s*/);
        }
      } else {
        if (type == "object" && typeof tagNames.length == "number") {
          applier.tagNames = [];
          for (i = 0, len = tagNames.length;i < len;++i) {
            if (tagNames[i] == "*") {
              applier.applyToAnyTagName = true;
            } else {
              applier.tagNames.push(tagNames[i].toLowerCase());
            }
          }
        } else {
          applier.tagNames = [applier.elementTagName];
        }
      }
    }
    ClassApplier.prototype = {elementTagName:defaultTagName, elementProperties:{}, elementAttributes:{}, ignoreWhiteSpace:true, applyToEditableOnly:false, useExistingElements:true, removeEmptyElements:true, onElementCreate:null, copyPropertiesToElement:function(props, el, createCopy) {
      var s, elStyle, elProps = {}, elPropsStyle, propValue, elPropValue, attrName;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          propValue = props[p];
          elPropValue = el[p];
          if (p == "className") {
            addClass(el, propValue);
            addClass(el, this.className);
            el[p] = sortClassName(el[p]);
            if (createCopy) {
              elProps[p] = el[p];
            }
          } else {
            if (p == "style") {
              elStyle = elPropValue;
              if (createCopy) {
                elProps[p] = elPropsStyle = {};
              }
              for (s in props[p]) {
                elStyle[s] = propValue[s];
                if (createCopy) {
                  elPropsStyle[s] = elStyle[s];
                }
              }
              this.attrExceptions.push(p);
            } else {
              el[p] = propValue;
              if (createCopy) {
                elProps[p] = el[p];
                attrName = attrNamesForProperties.hasOwnProperty(p) ? attrNamesForProperties[p] : p;
                this.attrExceptions.push(attrName);
              }
            }
          }
        }
      }
      return createCopy ? elProps : "";
    }, copyAttributesToElement:function(attrs, el) {
      for (var attrName in attrs) {
        if (attrs.hasOwnProperty(attrName)) {
          el.setAttribute(attrName, attrs[attrName]);
        }
      }
    }, hasClass:function(node) {
      return node.nodeType == 1 && contains(this.tagNames, node.tagName.toLowerCase()) && hasClass(node, this.className);
    }, getSelfOrAncestorWithClass:function(node) {
      while (node) {
        if (this.hasClass(node)) {
          return node;
        }
        node = node.parentNode;
      }
      return null;
    }, isModifiable:function(node) {
      return!this.applyToEditableOnly || isEditable(node);
    }, isIgnorableWhiteSpaceNode:function(node) {
      return this.ignoreWhiteSpace && node && node.nodeType == 3 && isUnrenderedWhiteSpaceNode(node);
    }, postApply:function(textNodes, range, positionsToPreserve, isUndo) {
      var firstNode = textNodes[0], lastNode = textNodes[textNodes.length - 1];
      var merges = [], currentMerge;
      var rangeStartNode = firstNode, rangeEndNode = lastNode;
      var rangeStartOffset = 0, rangeEndOffset = lastNode.length;
      var textNode, precedingTextNode;
      for (var i = 0, len = textNodes.length;i < len;++i) {
        textNode = textNodes[i];
        precedingTextNode = getPreviousMergeableTextNode(textNode, !isUndo);
        if (precedingTextNode) {
          if (!currentMerge) {
            currentMerge = new Merge(precedingTextNode);
            merges.push(currentMerge);
          }
          currentMerge.textNodes.push(textNode);
          if (textNode === firstNode) {
            rangeStartNode = currentMerge.textNodes[0];
            rangeStartOffset = rangeStartNode.length;
          }
          if (textNode === lastNode) {
            rangeEndNode = currentMerge.textNodes[0];
            rangeEndOffset = currentMerge.getLength();
          }
        } else {
          currentMerge = null;
        }
      }
      var nextTextNode = getNextMergeableTextNode(lastNode, !isUndo);
      if (nextTextNode) {
        if (!currentMerge) {
          currentMerge = new Merge(lastNode);
          merges.push(currentMerge);
        }
        currentMerge.textNodes.push(nextTextNode);
      }
      if (merges.length) {
        for (i = 0, len = merges.length;i < len;++i) {
          merges[i].doMerge(positionsToPreserve);
        }
        range.setStartAndEnd(rangeStartNode, rangeStartOffset, rangeEndNode, rangeEndOffset);
      }
    }, createContainer:function(doc) {
      var el = doc.createElement(this.elementTagName);
      this.copyPropertiesToElement(this.elementProperties, el, false);
      this.copyAttributesToElement(this.elementAttributes, el);
      addClass(el, this.className);
      if (this.onElementCreate) {
        this.onElementCreate(el, this);
      }
      return el;
    }, applyToTextNode:function(textNode, positionsToPreserve) {
      var parent = textNode.parentNode;
      if (parent.childNodes.length == 1 && this.useExistingElements && isHtmlNamespace(parent) && contains(this.tagNames, parent.tagName.toLowerCase()) && elementHasProperties(parent, this.elementProperties)) {
        addClass(parent, this.className);
      } else {
        var el = this.createContainer(dom.getDocument(textNode));
        textNode.parentNode.insertBefore(el, textNode);
        el.appendChild(textNode);
      }
    }, isRemovable:function(el) {
      return isHtmlNamespace(el) && el.tagName.toLowerCase() == this.elementTagName && getSortedClassName(el) == this.elementSortedClassName && elementHasProperties(el, this.elementProperties) && !elementHasNonClassAttributes(el, this.attrExceptions) && this.isModifiable(el);
    }, isEmptyContainer:function(el) {
      var childNodeCount = el.childNodes.length;
      return el.nodeType == 1 && this.isRemovable(el) && (childNodeCount == 0 || childNodeCount == 1 && this.isEmptyContainer(el.firstChild));
    }, removeEmptyContainers:function(range) {
      var applier = this;
      var nodesToRemove = range.getNodes([1], function(el) {
        return applier.isEmptyContainer(el);
      });
      var rangesToPreserve = [range];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
      for (var i = 0, node;node = nodesToRemove[i++];) {
        removePreservingPositions(node, positionsToPreserve);
      }
      updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
    }, undoToTextNode:function(textNode, range, ancestorWithClass, positionsToPreserve) {
      if (!range.containsNode(ancestorWithClass)) {
        var ancestorRange = range.cloneRange();
        ancestorRange.selectNode(ancestorWithClass);
        if (ancestorRange.isPointInRange(range.endContainer, range.endOffset)) {
          splitNodeAt(ancestorWithClass, range.endContainer, range.endOffset, positionsToPreserve);
          range.setEndAfter(ancestorWithClass);
        }
        if (ancestorRange.isPointInRange(range.startContainer, range.startOffset)) {
          ancestorWithClass = splitNodeAt(ancestorWithClass, range.startContainer, range.startOffset, positionsToPreserve);
        }
      }
      if (this.isRemovable(ancestorWithClass)) {
        replaceWithOwnChildrenPreservingPositions(ancestorWithClass, positionsToPreserve);
      } else {
        removeClass(ancestorWithClass, this.className);
      }
    }, applyToRange:function(range, rangesToPreserve) {
      rangesToPreserve = rangesToPreserve || [];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve || []);
      range.splitBoundariesPreservingPositions(positionsToPreserve);
      if (this.removeEmptyElements) {
        this.removeEmptyContainers(range);
      }
      var textNodes = getEffectiveTextNodes(range);
      if (textNodes.length) {
        for (var i = 0, textNode;textNode = textNodes[i++];) {
          if (!this.isIgnorableWhiteSpaceNode(textNode) && !this.getSelfOrAncestorWithClass(textNode) && this.isModifiable(textNode)) {
            this.applyToTextNode(textNode, positionsToPreserve);
          }
        }
        textNode = textNodes[textNodes.length - 1];
        range.setStartAndEnd(textNodes[0], 0, textNode, textNode.length);
        if (this.normalize) {
          this.postApply(textNodes, range, positionsToPreserve, false);
        }
        updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
      }
    }, applyToRanges:function(ranges) {
      var i = ranges.length;
      while (i--) {
        this.applyToRange(ranges[i], ranges);
      }
      return ranges;
    }, applyToSelection:function(win) {
      var sel = api.getSelection(win);
      sel.setRanges(this.applyToRanges(sel.getAllRanges()));
    }, undoToRange:function(range, rangesToPreserve) {
      rangesToPreserve = rangesToPreserve || [];
      var positionsToPreserve = getRangeBoundaries(rangesToPreserve);
      range.splitBoundariesPreservingPositions(positionsToPreserve);
      if (this.removeEmptyElements) {
        this.removeEmptyContainers(range, positionsToPreserve);
      }
      var textNodes = getEffectiveTextNodes(range);
      var textNode, ancestorWithClass;
      var lastTextNode = textNodes[textNodes.length - 1];
      if (textNodes.length) {
        for (var i = 0, len = textNodes.length;i < len;++i) {
          textNode = textNodes[i];
          ancestorWithClass = this.getSelfOrAncestorWithClass(textNode);
          if (ancestorWithClass && this.isModifiable(textNode)) {
            this.undoToTextNode(textNode, range, ancestorWithClass, positionsToPreserve);
          }
          range.setStartAndEnd(textNodes[0], 0, lastTextNode, lastTextNode.length);
        }
        if (this.normalize) {
          this.postApply(textNodes, range, positionsToPreserve, true);
        }
        updateRangesFromBoundaries(rangesToPreserve, positionsToPreserve);
      }
    }, undoToRanges:function(ranges) {
      var i = ranges.length;
      while (i--) {
        this.undoToRange(ranges[i], ranges);
      }
      return ranges;
    }, undoToSelection:function(win) {
      var sel = api.getSelection(win);
      var ranges = api.getSelection(win).getAllRanges();
      this.undoToRanges(ranges);
      sel.setRanges(ranges);
    }, isAppliedToRange:function(range) {
      if (range.collapsed || range.toString() == "") {
        return!!this.getSelfOrAncestorWithClass(range.commonAncestorContainer);
      } else {
        var textNodes = range.getNodes([3]);
        if (textNodes.length) {
          for (var i = 0, textNode;textNode = textNodes[i++];) {
            if (!this.isIgnorableWhiteSpaceNode(textNode) && rangeSelectsAnyText(range, textNode) && this.isModifiable(textNode) && !this.getSelfOrAncestorWithClass(textNode)) {
              return false;
            }
          }
        }
        return true;
      }
    }, isAppliedToRanges:function(ranges) {
      var i = ranges.length;
      if (i == 0) {
        return false;
      }
      while (i--) {
        if (!this.isAppliedToRange(ranges[i])) {
          return false;
        }
      }
      return true;
    }, isAppliedToSelection:function(win) {
      var sel = api.getSelection(win);
      return this.isAppliedToRanges(sel.getAllRanges());
    }, toggleRange:function(range) {
      if (this.isAppliedToRange(range)) {
        this.undoToRange(range);
      } else {
        this.applyToRange(range);
      }
    }, toggleSelection:function(win) {
      if (this.isAppliedToSelection(win)) {
        this.undoToSelection(win);
      } else {
        this.applyToSelection(win);
      }
    }, getElementsWithClassIntersectingRange:function(range) {
      var elements = [];
      var applier = this;
      range.getNodes([3], function(textNode) {
        var el = applier.getSelfOrAncestorWithClass(textNode);
        if (el && !contains(elements, el)) {
          elements.push(el);
        }
      });
      return elements;
    }, detach:function() {
    }};
    function createClassApplier(className, options, tagNames) {
      return new ClassApplier(className, options, tagNames);
    }
    ClassApplier.util = {hasClass:hasClass, addClass:addClass, removeClass:removeClass, hasSameClasses:haveSameClasses, replaceWithOwnChildren:replaceWithOwnChildrenPreservingPositions, elementsHaveSameNonClassAttributes:elementsHaveSameNonClassAttributes, elementHasNonClassAttributes:elementHasNonClassAttributes, splitNodeAt:splitNodeAt, isEditableElement:isEditableElement, isEditingHost:isEditingHost, isEditable:isEditable};
    api.CssClassApplier = api.ClassApplier = ClassApplier;
    api.createCssClassApplier = api.createClassApplier = createClassApplier;
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("SaveRestore", ["WrappedRange"], function(api, module) {
    var dom = api.dom;
    var markerTextChar = "\ufeff";
    function gEBI(id, doc) {
      return(doc || document).getElementById(id);
    }
    function insertRangeBoundaryMarker(range, atStart) {
      var markerId = "selectionBoundary_" + +new Date + "_" + ("" + Math.random()).slice(2);
      var markerEl;
      var doc = dom.getDocument(range.startContainer);
      var boundaryRange = range.cloneRange();
      boundaryRange.collapse(atStart);
      markerEl = doc.createElement("span");
      markerEl.id = markerId;
      markerEl.style.lineHeight = "0";
      markerEl.style.display = "none";
      markerEl.className = "rangySelectionBoundary";
      markerEl.appendChild(doc.createTextNode(markerTextChar));
      boundaryRange.insertNode(markerEl);
      return markerEl;
    }
    function setRangeBoundary(doc, range, markerId, atStart) {
      var markerEl = gEBI(markerId, doc);
      if (markerEl) {
        range[atStart ? "setStartBefore" : "setEndBefore"](markerEl);
        markerEl.parentNode.removeChild(markerEl);
      } else {
        module.warn("Marker element has been removed. Cannot restore selection.");
      }
    }
    function compareRanges(r1, r2) {
      return r2.compareBoundaryPoints(r1.START_TO_START, r1);
    }
    function saveRange(range, backward) {
      var startEl, endEl, doc = api.DomRange.getRangeDocument(range), text = range.toString();
      if (range.collapsed) {
        endEl = insertRangeBoundaryMarker(range, false);
        return{document:doc, markerId:endEl.id, collapsed:true};
      } else {
        endEl = insertRangeBoundaryMarker(range, false);
        startEl = insertRangeBoundaryMarker(range, true);
        return{document:doc, startMarkerId:startEl.id, endMarkerId:endEl.id, collapsed:false, backward:backward, toString:function() {
          return "original text: '" + text + "', new text: '" + range.toString() + "'";
        }};
      }
    }
    function restoreRange(rangeInfo, normalize) {
      var doc = rangeInfo.document;
      if (typeof normalize == "undefined") {
        normalize = true;
      }
      var range = api.createRange(doc);
      if (rangeInfo.collapsed) {
        var markerEl = gEBI(rangeInfo.markerId, doc);
        if (markerEl) {
          markerEl.style.display = "inline";
          var previousNode = markerEl.previousSibling;
          if (previousNode && previousNode.nodeType == 3) {
            markerEl.parentNode.removeChild(markerEl);
            range.collapseToPoint(previousNode, previousNode.length);
          } else {
            range.collapseBefore(markerEl);
            markerEl.parentNode.removeChild(markerEl);
          }
        } else {
          module.warn("Marker element has been removed. Cannot restore selection.");
        }
      } else {
        setRangeBoundary(doc, range, rangeInfo.startMarkerId, true);
        setRangeBoundary(doc, range, rangeInfo.endMarkerId, false);
      }
      if (normalize) {
        range.normalizeBoundaries();
      }
      return range;
    }
    function saveRanges(ranges, backward) {
      var rangeInfos = [], range, doc;
      ranges = ranges.slice(0);
      ranges.sort(compareRanges);
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = saveRange(ranges[i], backward);
      }
      for (i = len - 1;i >= 0;--i) {
        range = ranges[i];
        doc = api.DomRange.getRangeDocument(range);
        if (range.collapsed) {
          range.collapseAfter(gEBI(rangeInfos[i].markerId, doc));
        } else {
          range.setEndBefore(gEBI(rangeInfos[i].endMarkerId, doc));
          range.setStartAfter(gEBI(rangeInfos[i].startMarkerId, doc));
        }
      }
      return rangeInfos;
    }
    function saveSelection(win) {
      if (!api.isSelectionValid(win)) {
        module.warn("Cannot save selection. This usually happens when the selection is collapsed and the selection document has lost focus.");
        return null;
      }
      var sel = api.getSelection(win);
      var ranges = sel.getAllRanges();
      var backward = ranges.length == 1 && sel.isBackward();
      var rangeInfos = saveRanges(ranges, backward);
      if (backward) {
        sel.setSingleRange(ranges[0], "backward");
      } else {
        sel.setRanges(ranges);
      }
      return{win:win, rangeInfos:rangeInfos, restored:false};
    }
    function restoreRanges(rangeInfos) {
      var ranges = [];
      var rangeCount = rangeInfos.length;
      for (var i = rangeCount - 1;i >= 0;i--) {
        ranges[i] = restoreRange(rangeInfos[i], true);
      }
      return ranges;
    }
    function restoreSelection(savedSelection, preserveDirection) {
      if (!savedSelection.restored) {
        var rangeInfos = savedSelection.rangeInfos;
        var sel = api.getSelection(savedSelection.win);
        var ranges = restoreRanges(rangeInfos), rangeCount = rangeInfos.length;
        if (rangeCount == 1 && preserveDirection && api.features.selectionHasExtend && rangeInfos[0].backward) {
          sel.removeAllRanges();
          sel.addRange(ranges[0], true);
        } else {
          sel.setRanges(ranges);
        }
        savedSelection.restored = true;
      }
    }
    function removeMarkerElement(doc, markerId) {
      var markerEl = gEBI(markerId, doc);
      if (markerEl) {
        markerEl.parentNode.removeChild(markerEl);
      }
    }
    function removeMarkers(savedSelection) {
      var rangeInfos = savedSelection.rangeInfos;
      for (var i = 0, len = rangeInfos.length, rangeInfo;i < len;++i) {
        rangeInfo = rangeInfos[i];
        if (rangeInfo.collapsed) {
          removeMarkerElement(savedSelection.doc, rangeInfo.markerId);
        } else {
          removeMarkerElement(savedSelection.doc, rangeInfo.startMarkerId);
          removeMarkerElement(savedSelection.doc, rangeInfo.endMarkerId);
        }
      }
    }
    api.util.extend(api, {saveRange:saveRange, restoreRange:restoreRange, saveRanges:saveRanges, restoreRanges:restoreRanges, saveSelection:saveSelection, restoreSelection:restoreSelection, removeMarkerElement:removeMarkerElement, removeMarkers:removeMarkers});
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("Serializer", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    if (typeof encodeURIComponent == UNDEF || typeof decodeURIComponent == UNDEF) {
      module.fail("encodeURIComponent and/or decodeURIComponent method is missing");
    }
    var crc32 = function() {
      function utf8encode(str) {
        var utf8CharCodes = [];
        for (var i = 0, len = str.length, c;i < len;++i) {
          c = str.charCodeAt(i);
          if (c < 128) {
            utf8CharCodes.push(c);
          } else {
            if (c < 2048) {
              utf8CharCodes.push(c >> 6 | 192, c & 63 | 128);
            } else {
              utf8CharCodes.push(c >> 12 | 224, c >> 6 & 63 | 128, c & 63 | 128);
            }
          }
        }
        return utf8CharCodes;
      }
      var cachedCrcTable = null;
      function buildCRCTable() {
        var table = [];
        for (var i = 0, j, crc;i < 256;++i) {
          crc = i;
          j = 8;
          while (j--) {
            if ((crc & 1) == 1) {
              crc = crc >>> 1 ^ 3988292384;
            } else {
              crc >>>= 1;
            }
          }
          table[i] = crc >>> 0;
        }
        return table;
      }
      function getCrcTable() {
        if (!cachedCrcTable) {
          cachedCrcTable = buildCRCTable();
        }
        return cachedCrcTable;
      }
      return function(str) {
        var utf8CharCodes = utf8encode(str), crc = -1, crcTable = getCrcTable();
        for (var i = 0, len = utf8CharCodes.length, y;i < len;++i) {
          y = (crc ^ utf8CharCodes[i]) & 255;
          crc = crc >>> 8 ^ crcTable[y];
        }
        return(crc ^ -1) >>> 0;
      };
    }();
    var dom = api.dom;
    function escapeTextForHtml(str) {
      return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function nodeToInfoString(node, infoParts) {
      infoParts = infoParts || [];
      var nodeType = node.nodeType, children = node.childNodes, childCount = children.length;
      var nodeInfo = [nodeType, node.nodeName, childCount].join(":");
      var start = "", end = "";
      switch(nodeType) {
        case 3:
          start = escapeTextForHtml(node.nodeValue);
          break;
        case 8:
          start = "\x3c!--" + escapeTextForHtml(node.nodeValue) + "--\x3e";
          break;
        default:
          start = "<" + nodeInfo + ">";
          end = "</>";
          break;
      }
      if (start) {
        infoParts.push(start);
      }
      for (var i = 0;i < childCount;++i) {
        nodeToInfoString(children[i], infoParts);
      }
      if (end) {
        infoParts.push(end);
      }
      return infoParts;
    }
    function getElementChecksum(el) {
      var info = nodeToInfoString(el).join("");
      return crc32(info).toString(16);
    }
    function serializePosition(node, offset, rootNode) {
      var pathParts = [], n = node;
      rootNode = rootNode || dom.getDocument(node).documentElement;
      while (n && n != rootNode) {
        pathParts.push(dom.getNodeIndex(n, true));
        n = n.parentNode;
      }
      return pathParts.join("/") + ":" + offset;
    }
    function deserializePosition(serialized, rootNode, doc) {
      if (!rootNode) {
        rootNode = (doc || document).documentElement;
      }
      var parts = serialized.split(":");
      var node = rootNode;
      var nodeIndices = parts[0] ? parts[0].split("/") : [], i = nodeIndices.length, nodeIndex;
      while (i--) {
        nodeIndex = parseInt(nodeIndices[i], 10);
        if (nodeIndex < node.childNodes.length) {
          node = node.childNodes[nodeIndex];
        } else {
          throw module.createError("deserializePosition() failed: node " + dom.inspectNode(node) + " has no child with index " + nodeIndex + ", " + i);
        }
      }
      return new dom.DomPosition(node, parseInt(parts[1], 10));
    }
    function serializeRange(range, omitChecksum, rootNode) {
      rootNode = rootNode || api.DomRange.getRangeDocument(range).documentElement;
      if (!dom.isOrIsAncestorOf(rootNode, range.commonAncestorContainer)) {
        throw module.createError("serializeRange(): range " + range.inspect() + " is not wholly contained within specified root node " + dom.inspectNode(rootNode));
      }
      var serialized = serializePosition(range.startContainer, range.startOffset, rootNode) + "," + serializePosition(range.endContainer, range.endOffset, rootNode);
      if (!omitChecksum) {
        serialized += "{" + getElementChecksum(rootNode) + "}";
      }
      return serialized;
    }
    var deserializeRegex = /^([^,]+),([^,\{]+)(\{([^}]+)\})?$/;
    function deserializeRange(serialized, rootNode, doc) {
      if (rootNode) {
        doc = doc || dom.getDocument(rootNode);
      } else {
        doc = doc || document;
        rootNode = doc.documentElement;
      }
      var result = deserializeRegex.exec(serialized);
      var checksum = result[4];
      if (checksum) {
        var rootNodeChecksum = getElementChecksum(rootNode);
        if (checksum !== rootNodeChecksum) {
          throw module.createError("deserializeRange(): checksums of serialized range root node (" + checksum + ") and target root node (" + rootNodeChecksum + ") do not match");
        }
      }
      var start = deserializePosition(result[1], rootNode, doc), end = deserializePosition(result[2], rootNode, doc);
      var range = api.createRange(doc);
      range.setStartAndEnd(start.node, start.offset, end.node, end.offset);
      return range;
    }
    function canDeserializeRange(serialized, rootNode, doc) {
      if (!rootNode) {
        rootNode = (doc || document).documentElement;
      }
      var result = deserializeRegex.exec(serialized);
      var checksum = result[3];
      return!checksum || checksum === getElementChecksum(rootNode);
    }
    function serializeSelection(selection, omitChecksum, rootNode) {
      selection = api.getSelection(selection);
      var ranges = selection.getAllRanges(), serializedRanges = [];
      for (var i = 0, len = ranges.length;i < len;++i) {
        serializedRanges[i] = serializeRange(ranges[i], omitChecksum, rootNode);
      }
      return serializedRanges.join("|");
    }
    function deserializeSelection(serialized, rootNode, win) {
      if (rootNode) {
        win = win || dom.getWindow(rootNode);
      } else {
        win = win || window;
        rootNode = win.document.documentElement;
      }
      var serializedRanges = serialized.split("|");
      var sel = api.getSelection(win);
      var ranges = [];
      for (var i = 0, len = serializedRanges.length;i < len;++i) {
        ranges[i] = deserializeRange(serializedRanges[i], rootNode, win.document);
      }
      sel.setRanges(ranges);
      return sel;
    }
    function canDeserializeSelection(serialized, rootNode, win) {
      var doc;
      if (rootNode) {
        doc = win ? win.document : dom.getDocument(rootNode);
      } else {
        win = win || window;
        rootNode = win.document.documentElement;
      }
      var serializedRanges = serialized.split("|");
      for (var i = 0, len = serializedRanges.length;i < len;++i) {
        if (!canDeserializeRange(serializedRanges[i], rootNode, doc)) {
          return false;
        }
      }
      return true;
    }
    var cookieName = "rangySerializedSelection";
    function getSerializedSelectionFromCookie(cookie) {
      var parts = cookie.split(/[;,]/);
      for (var i = 0, len = parts.length, nameVal, val;i < len;++i) {
        nameVal = parts[i].split("=");
        if (nameVal[0].replace(/^\s+/, "") == cookieName) {
          val = nameVal[1];
          if (val) {
            return decodeURIComponent(val.replace(/\s+$/, ""));
          }
        }
      }
      return null;
    }
    function restoreSelectionFromCookie(win) {
      win = win || window;
      var serialized = getSerializedSelectionFromCookie(win.document.cookie);
      if (serialized) {
        deserializeSelection(serialized, win.doc);
      }
    }
    function saveSelectionCookie(win, props) {
      win = win || window;
      props = typeof props == "object" ? props : {};
      var expires = props.expires ? ";expires=" + props.expires.toUTCString() : "";
      var path = props.path ? ";path=" + props.path : "";
      var domain = props.domain ? ";domain=" + props.domain : "";
      var secure = props.secure ? ";secure" : "";
      var serialized = serializeSelection(api.getSelection(win));
      win.document.cookie = encodeURIComponent(cookieName) + "=" + encodeURIComponent(serialized) + expires + path + domain + secure;
    }
    api.serializePosition = serializePosition;
    api.deserializePosition = deserializePosition;
    api.serializeRange = serializeRange;
    api.deserializeRange = deserializeRange;
    api.canDeserializeRange = canDeserializeRange;
    api.serializeSelection = serializeSelection;
    api.deserializeSelection = deserializeSelection;
    api.canDeserializeSelection = canDeserializeSelection;
    api.restoreSelectionFromCookie = restoreSelectionFromCookie;
    api.saveSelectionCookie = saveSelectionCookie;
    api.getElementChecksum = getElementChecksum;
    api.nodeToInfoString = nodeToInfoString;
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("Highlighter", ["ClassApplier"], function(api, module) {
    var dom = api.dom;
    var contains = dom.arrayContains;
    var getBody = dom.getBody;
    var createOptions = api.util.createOptions;
    function compareHighlights(h1, h2) {
      return h1.characterRange.start - h2.characterRange.start;
    }
    var forEach = [].forEach ? function(arr, func) {
      arr.forEach(func);
    } : function(arr, func) {
      for (var i = 0, len = arr.length;i < len;++i) {
        func(arr[i]);
      }
    };
    var nextHighlightId = 1;
    var highlighterTypes = {};
    function HighlighterType(type, converterCreator) {
      this.type = type;
      this.converterCreator = converterCreator;
    }
    HighlighterType.prototype.create = function() {
      var converter = this.converterCreator();
      converter.type = this.type;
      return converter;
    };
    function registerHighlighterType(type, converterCreator) {
      highlighterTypes[type] = new HighlighterType(type, converterCreator);
    }
    function getConverter(type) {
      var highlighterType = highlighterTypes[type];
      if (highlighterType instanceof HighlighterType) {
        return highlighterType.create();
      } else {
        throw new Error("Highlighter type '" + type + "' is not valid");
      }
    }
    api.registerHighlighterType = registerHighlighterType;
    function CharacterRange(start, end) {
      this.start = start;
      this.end = end;
    }
    CharacterRange.prototype = {intersects:function(charRange) {
      return this.start < charRange.end && this.end > charRange.start;
    }, isContiguousWith:function(charRange) {
      return this.start == charRange.end || this.end == charRange.start;
    }, union:function(charRange) {
      return new CharacterRange(Math.min(this.start, charRange.start), Math.max(this.end, charRange.end));
    }, intersection:function(charRange) {
      return new CharacterRange(Math.max(this.start, charRange.start), Math.min(this.end, charRange.end));
    }, getComplements:function(charRange) {
      var ranges = [];
      if (this.start >= charRange.start) {
        if (this.end <= charRange.end) {
          return[];
        }
        ranges.push(new CharacterRange(charRange.end, this.end));
      } else {
        ranges.push(new CharacterRange(this.start, Math.min(this.end, charRange.start)));
        if (this.end > charRange.end) {
          ranges.push(new CharacterRange(charRange.end, this.end));
        }
      }
      return ranges;
    }, toString:function() {
      return "[CharacterRange(" + this.start + ", " + this.end + ")]";
    }};
    CharacterRange.fromCharacterRange = function(charRange) {
      return new CharacterRange(charRange.start, charRange.end);
    };
    var textContentConverter = {rangeToCharacterRange:function(range, containerNode) {
      var bookmark = range.getBookmark(containerNode);
      return new CharacterRange(bookmark.start, bookmark.end);
    }, characterRangeToRange:function(doc, characterRange, containerNode) {
      var range = api.createRange(doc);
      range.moveToBookmark({start:characterRange.start, end:characterRange.end, containerNode:containerNode});
      return range;
    }, serializeSelection:function(selection, containerNode) {
      var ranges = selection.getAllRanges(), rangeCount = ranges.length;
      var rangeInfos = [];
      var backward = rangeCount == 1 && selection.isBackward();
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = {characterRange:this.rangeToCharacterRange(ranges[i], containerNode), backward:backward};
      }
      return rangeInfos;
    }, restoreSelection:function(selection, savedSelection, containerNode) {
      selection.removeAllRanges();
      var doc = selection.win.document;
      for (var i = 0, len = savedSelection.length, range, rangeInfo, characterRange;i < len;++i) {
        rangeInfo = savedSelection[i];
        characterRange = rangeInfo.characterRange;
        range = this.characterRangeToRange(doc, rangeInfo.characterRange, containerNode);
        selection.addRange(range, rangeInfo.backward);
      }
    }};
    registerHighlighterType("textContent", function() {
      return textContentConverter;
    });
    registerHighlighterType("TextRange", function() {
      var converter;
      return function() {
        if (!converter) {
          var textRangeModule = api.modules.TextRange;
          if (!textRangeModule) {
            throw new Error("TextRange module is missing.");
          } else {
            if (!textRangeModule.supported) {
              throw new Error("TextRange module is present but not supported.");
            }
          }
          converter = {rangeToCharacterRange:function(range, containerNode) {
            return CharacterRange.fromCharacterRange(range.toCharacterRange(containerNode));
          }, characterRangeToRange:function(doc, characterRange, containerNode) {
            var range = api.createRange(doc);
            range.selectCharacters(containerNode, characterRange.start, characterRange.end);
            return range;
          }, serializeSelection:function(selection, containerNode) {
            return selection.saveCharacterRanges(containerNode);
          }, restoreSelection:function(selection, savedSelection, containerNode) {
            selection.restoreCharacterRanges(containerNode, savedSelection);
          }};
        }
        return converter;
      };
    }());
    function Highlight(doc, characterRange, classApplier, converter, id, containerElementId) {
      if (id) {
        this.id = id;
        nextHighlightId = Math.max(nextHighlightId, id + 1);
      } else {
        this.id = nextHighlightId++;
      }
      this.characterRange = characterRange;
      this.doc = doc;
      this.classApplier = classApplier;
      this.converter = converter;
      this.containerElementId = containerElementId || null;
      this.applied = false;
    }
    Highlight.prototype = {getContainerElement:function() {
      return this.containerElementId ? this.doc.getElementById(this.containerElementId) : getBody(this.doc);
    }, getRange:function() {
      return this.converter.characterRangeToRange(this.doc, this.characterRange, this.getContainerElement());
    }, fromRange:function(range) {
      this.characterRange = this.converter.rangeToCharacterRange(range, this.getContainerElement());
    }, getText:function() {
      return this.getRange().toString();
    }, containsElement:function(el) {
      return this.getRange().containsNodeContents(el.firstChild);
    }, unapply:function() {
      this.classApplier.undoToRange(this.getRange());
      this.applied = false;
    }, apply:function() {
      this.classApplier.applyToRange(this.getRange());
      this.applied = true;
    }, getHighlightElements:function() {
      return this.classApplier.getElementsWithClassIntersectingRange(this.getRange());
    }, toString:function() {
      return "[Highlight(ID: " + this.id + ", class: " + this.classApplier.className + ", character range: " + this.characterRange.start + " - " + this.characterRange.end + ")]";
    }};
    function Highlighter(doc, type) {
      type = type || "textContent";
      this.doc = doc || document;
      this.classAppliers = {};
      this.highlights = [];
      this.converter = getConverter(type);
    }
    Highlighter.prototype = {addClassApplier:function(classApplier) {
      this.classAppliers[classApplier.className] = classApplier;
    }, getHighlightForElement:function(el) {
      var highlights = this.highlights;
      for (var i = 0, len = highlights.length;i < len;++i) {
        if (highlights[i].containsElement(el)) {
          return highlights[i];
        }
      }
      return null;
    }, removeHighlights:function(highlights) {
      for (var i = 0, len = this.highlights.length, highlight;i < len;++i) {
        highlight = this.highlights[i];
        if (contains(highlights, highlight)) {
          highlight.unapply();
          this.highlights.splice(i--, 1);
        }
      }
    }, removeAllHighlights:function() {
      this.removeHighlights(this.highlights);
    }, getIntersectingHighlights:function(ranges) {
      var intersectingHighlights = [], highlights = this.highlights, converter = this.converter;
      forEach(ranges, function(range) {
        forEach(highlights, function(highlight) {
          if (range.intersectsRange(highlight.getRange()) && !contains(intersectingHighlights, highlight)) {
            intersectingHighlights.push(highlight);
          }
        });
      });
      return intersectingHighlights;
    }, highlightCharacterRanges:function(className, charRanges, options) {
      var i, len, j;
      var highlights = this.highlights;
      var converter = this.converter;
      var doc = this.doc;
      var highlightsToRemove = [];
      var classApplier = className ? this.classAppliers[className] : null;
      options = createOptions(options, {containerElementId:null, exclusive:true});
      var containerElementId = options.containerElementId;
      var exclusive = options.exclusive;
      var containerElement, containerElementRange, containerElementCharRange;
      if (containerElementId) {
        containerElement = this.doc.getElementById(containerElementId);
        if (containerElement) {
          containerElementRange = api.createRange(this.doc);
          containerElementRange.selectNodeContents(containerElement);
          containerElementCharRange = new CharacterRange(0, containerElementRange.toString().length);
        }
      }
      var charRange, highlightCharRange, removeHighlight, isSameClassApplier, highlightsToKeep, splitHighlight;
      for (i = 0, len = charRanges.length;i < len;++i) {
        charRange = charRanges[i];
        highlightsToKeep = [];
        if (containerElementCharRange) {
          charRange = charRange.intersection(containerElementCharRange);
        }
        if (charRange.start == charRange.end) {
          continue;
        }
        for (j = 0;j < highlights.length;++j) {
          removeHighlight = false;
          if (containerElementId == highlights[j].containerElementId) {
            highlightCharRange = highlights[j].characterRange;
            isSameClassApplier = classApplier == highlights[j].classApplier;
            splitHighlight = !isSameClassApplier && exclusive;
            if ((highlightCharRange.intersects(charRange) || highlightCharRange.isContiguousWith(charRange)) && (isSameClassApplier || splitHighlight)) {
              if (splitHighlight) {
                forEach(highlightCharRange.getComplements(charRange), function(rangeToAdd) {
                  highlightsToKeep.push(new Highlight(doc, rangeToAdd, highlights[j].classApplier, converter, null, containerElementId));
                });
              }
              removeHighlight = true;
              if (isSameClassApplier) {
                charRange = highlightCharRange.union(charRange);
              }
            }
          }
          if (removeHighlight) {
            highlightsToRemove.push(highlights[j]);
            highlights[j] = new Highlight(doc, highlightCharRange.union(charRange), classApplier, converter, null, containerElementId);
          } else {
            highlightsToKeep.push(highlights[j]);
          }
        }
        if (classApplier) {
          highlightsToKeep.push(new Highlight(doc, charRange, classApplier, converter, null, containerElementId));
        }
        this.highlights = highlights = highlightsToKeep;
      }
      forEach(highlightsToRemove, function(highlightToRemove) {
        highlightToRemove.unapply();
      });
      var newHighlights = [];
      forEach(highlights, function(highlight) {
        if (!highlight.applied) {
          highlight.apply();
          newHighlights.push(highlight);
        }
      });
      return newHighlights;
    }, highlightRanges:function(className, ranges, options) {
      var selCharRanges = [];
      var converter = this.converter;
      options = createOptions(options, {containerElement:null, exclusive:true});
      var containerElement = options.containerElement;
      var containerElementId = containerElement ? containerElement.id : null;
      var containerElementRange;
      if (containerElement) {
        containerElementRange = api.createRange(containerElement);
        containerElementRange.selectNodeContents(containerElement);
      }
      forEach(ranges, function(range) {
        var scopedRange = containerElement ? containerElementRange.intersection(range) : range;
        selCharRanges.push(converter.rangeToCharacterRange(scopedRange, containerElement || getBody(range.getDocument())));
      });
      return this.highlightCharacterRanges(className, selCharRanges, {containerElementId:containerElementId, exclusive:options.exclusive});
    }, highlightSelection:function(className, options) {
      var converter = this.converter;
      var classApplier = className ? this.classAppliers[className] : false;
      options = createOptions(options, {containerElementId:null, selection:api.getSelection(), exclusive:true});
      var containerElementId = options.containerElementId;
      var exclusive = options.exclusive;
      var selection = options.selection;
      var doc = selection.win.document;
      var containerElement = containerElementId ? doc.getElementById(containerElementId) : getBody(doc);
      if (!classApplier && className !== false) {
        throw new Error("No class applier found for class '" + className + "'");
      }
      var serializedSelection = converter.serializeSelection(selection, containerElement);
      var selCharRanges = [];
      forEach(serializedSelection, function(rangeInfo) {
        selCharRanges.push(CharacterRange.fromCharacterRange(rangeInfo.characterRange));
      });
      var newHighlights = this.highlightCharacterRanges(className, selCharRanges, {containerElementId:containerElementId, exclusive:exclusive});
      converter.restoreSelection(selection, serializedSelection, containerElement);
      return newHighlights;
    }, unhighlightSelection:function(selection) {
      selection = selection || api.getSelection();
      var intersectingHighlights = this.getIntersectingHighlights(selection.getAllRanges());
      this.removeHighlights(intersectingHighlights);
      selection.removeAllRanges();
      return intersectingHighlights;
    }, getHighlightsInSelection:function(selection) {
      selection = selection || api.getSelection();
      return this.getIntersectingHighlights(selection.getAllRanges());
    }, selectionOverlapsHighlight:function(selection) {
      return this.getHighlightsInSelection(selection).length > 0;
    }, serialize:function(options) {
      var highlights = this.highlights;
      highlights.sort(compareHighlights);
      var serializedHighlights = ["type:" + this.converter.type];
      options = createOptions(options, {serializeHighlightText:false});
      forEach(highlights, function(highlight) {
        var characterRange = highlight.characterRange;
        var parts = [characterRange.start, characterRange.end, highlight.id, highlight.classApplier.className, highlight.containerElementId];
        if (options.serializeHighlightText) {
          parts.push(highlight.getText());
        }
        serializedHighlights.push(parts.join("$"));
      });
      return serializedHighlights.join("|");
    }, deserialize:function(serialized) {
      var serializedHighlights = serialized.split("|");
      var highlights = [];
      var firstHighlight = serializedHighlights[0];
      var regexResult;
      var serializationType, serializationConverter, convertType = false;
      if (firstHighlight && (regexResult = /^type:(\w+)$/.exec(firstHighlight))) {
        serializationType = regexResult[1];
        if (serializationType != this.converter.type) {
          serializationConverter = getConverter(serializationType);
          convertType = true;
        }
        serializedHighlights.shift();
      } else {
        throw new Error("Serialized highlights are invalid.");
      }
      var classApplier, highlight, characterRange, containerElementId, containerElement;
      for (var i = serializedHighlights.length, parts;i-- > 0;) {
        parts = serializedHighlights[i].split("$");
        characterRange = new CharacterRange(+parts[0], +parts[1]);
        containerElementId = parts[4] || null;
        containerElement = containerElementId ? this.doc.getElementById(containerElementId) : getBody(this.doc);
        if (convertType) {
          characterRange = this.converter.rangeToCharacterRange(serializationConverter.characterRangeToRange(this.doc, characterRange, containerElement), containerElement);
        }
        classApplier = this.classAppliers[parts[3]];
        if (!classApplier) {
          throw new Error("No class applier found for class '" + parts[3] + "'");
        }
        highlight = new Highlight(this.doc, characterRange, classApplier, this.converter, parseInt(parts[2]), containerElementId);
        highlight.apply();
        highlights.push(highlight);
      }
      this.highlights = highlights;
    }};
    api.Highlighter = Highlighter;
    api.createHighlighter = function(doc, rangeCharacterOffsetConverterType) {
      return new Highlighter(doc, rangeCharacterOffsetConverterType);
    };
  });
}, this);
(function(factory, root) {
  if (typeof define == "function" && define.amd) {
    define(["./rangy-core"], factory);
  } else {
    if (typeof module != "undefined" && typeof exports == "object") {
      module.exports = factory(require("rangy"));
    } else {
      factory(root.rangy);
    }
  }
})(function(rangy) {
  rangy.createModule("TextRange", ["WrappedSelection"], function(api, module) {
    var UNDEF = "undefined";
    var CHARACTER = "character", WORD = "word";
    var dom = api.dom, util = api.util;
    var extend = util.extend;
    var createOptions = util.createOptions;
    var getBody = dom.getBody;
    var spacesRegex = /^[ \t\f\r\n]+$/;
    var spacesMinusLineBreaksRegex = /^[ \t\f\r]+$/;
    var allWhiteSpaceRegex = /^[\t-\r \u0085\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]+$/;
    var nonLineBreakWhiteSpaceRegex = /^[\t \u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]+$/;
    var lineBreakRegex = /^[\n-\r\u0085\u2028\u2029]$/;
    var defaultLanguage = "en";
    var isDirectionBackward = api.Selection.isDirectionBackward;
    var trailingSpaceInBlockCollapses = false;
    var trailingSpaceBeforeBrCollapses = false;
    var trailingSpaceBeforeBlockCollapses = false;
    var trailingSpaceBeforeLineBreakInPreLineCollapses = true;
    (function() {
      var el = document.createElement("div");
      el.contentEditable = "true";
      el.innerHTML = "<p>1 </p><p></p>";
      var body = getBody(document);
      var p = el.firstChild;
      var sel = api.getSelection();
      body.appendChild(el);
      sel.collapse(p.lastChild, 2);
      sel.setStart(p.firstChild, 0);
      trailingSpaceInBlockCollapses = ("" + sel).length == 1;
      el.innerHTML = "1 <br />";
      sel.collapse(el, 2);
      sel.setStart(el.firstChild, 0);
      trailingSpaceBeforeBrCollapses = ("" + sel).length == 1;
      el.innerHTML = "1 <p>1</p>";
      sel.collapse(el, 2);
      sel.setStart(el.firstChild, 0);
      trailingSpaceBeforeBlockCollapses = ("" + sel).length == 1;
      body.removeChild(el);
      sel.removeAllRanges();
    })();
    function defaultTokenizer(chars, wordOptions) {
      var word = chars.join(""), result, tokens = [];
      function createTokenFromRange(start, end, isWord) {
        var tokenChars = chars.slice(start, end);
        var token = {isWord:isWord, chars:tokenChars, toString:function() {
          return tokenChars.join("");
        }};
        for (var i = 0, len = tokenChars.length;i < len;++i) {
          tokenChars[i].token = token;
        }
        tokens.push(token);
      }
      var lastWordEnd = 0, wordStart, wordEnd;
      while (result = wordOptions.wordRegex.exec(word)) {
        wordStart = result.index;
        wordEnd = wordStart + result[0].length;
        if (wordStart > lastWordEnd) {
          createTokenFromRange(lastWordEnd, wordStart, false);
        }
        if (wordOptions.includeTrailingSpace) {
          while (nonLineBreakWhiteSpaceRegex.test(chars[wordEnd])) {
            ++wordEnd;
          }
        }
        createTokenFromRange(wordStart, wordEnd, true);
        lastWordEnd = wordEnd;
      }
      if (lastWordEnd < chars.length) {
        createTokenFromRange(lastWordEnd, chars.length, false);
      }
      return tokens;
    }
    var defaultCharacterOptions = {includeBlockContentTrailingSpace:true, includeSpaceBeforeBr:true, includeSpaceBeforeBlock:true, includePreLineTrailingSpace:true, ignoreCharacters:""};
    function normalizeIgnoredCharacters(ignoredCharacters) {
      var ignoredChars = ignoredCharacters || "";
      var ignoredCharsArray = typeof ignoredChars == "string" ? ignoredChars.split("") : ignoredChars;
      ignoredCharsArray.sort(function(char1, char2) {
        return char1.charCodeAt(0) - char2.charCodeAt(0);
      });
      return ignoredCharsArray.join("").replace(/(.)\1+/g, "$1");
    }
    var defaultCaretCharacterOptions = {includeBlockContentTrailingSpace:!trailingSpaceBeforeLineBreakInPreLineCollapses, includeSpaceBeforeBr:!trailingSpaceBeforeBrCollapses, includeSpaceBeforeBlock:!trailingSpaceBeforeBlockCollapses, includePreLineTrailingSpace:true};
    var defaultWordOptions = {"en":{wordRegex:/[a-z0-9]+('[a-z0-9]+)*/gi, includeTrailingSpace:false, tokenizer:defaultTokenizer}};
    var defaultFindOptions = {caseSensitive:false, withinRange:null, wholeWordsOnly:false, wrap:false, direction:"forward", wordOptions:null, characterOptions:null};
    var defaultMoveOptions = {wordOptions:null, characterOptions:null};
    var defaultExpandOptions = {wordOptions:null, characterOptions:null, trim:false, trimStart:true, trimEnd:true};
    var defaultWordIteratorOptions = {wordOptions:null, characterOptions:null, direction:"forward"};
    function createWordOptions(options) {
      var lang, defaults;
      if (!options) {
        return defaultWordOptions[defaultLanguage];
      } else {
        lang = options.language || defaultLanguage;
        defaults = {};
        extend(defaults, defaultWordOptions[lang] || defaultWordOptions[defaultLanguage]);
        extend(defaults, options);
        return defaults;
      }
    }
    function createNestedOptions(optionsParam, defaults) {
      var options = createOptions(optionsParam, defaults);
      if (defaults.hasOwnProperty("wordOptions")) {
        options.wordOptions = createWordOptions(options.wordOptions);
      }
      if (defaults.hasOwnProperty("characterOptions")) {
        options.characterOptions = createOptions(options.characterOptions, defaultCharacterOptions);
      }
      return options;
    }
    var getComputedStyleProperty = dom.getComputedStyleProperty;
    var tableCssDisplayBlock;
    (function() {
      var table = document.createElement("table");
      var body = getBody(document);
      body.appendChild(table);
      tableCssDisplayBlock = getComputedStyleProperty(table, "display") == "block";
      body.removeChild(table);
    })();
    api.features.tableCssDisplayBlock = tableCssDisplayBlock;
    var defaultDisplayValueForTag = {table:"table", caption:"table-caption", colgroup:"table-column-group", col:"table-column", thead:"table-header-group", tbody:"table-row-group", tfoot:"table-footer-group", tr:"table-row", td:"table-cell", th:"table-cell"};
    function getComputedDisplay(el, win) {
      var display = getComputedStyleProperty(el, "display", win);
      var tagName = el.tagName.toLowerCase();
      return display == "block" && tableCssDisplayBlock && defaultDisplayValueForTag.hasOwnProperty(tagName) ? defaultDisplayValueForTag[tagName] : display;
    }
    function isHidden(node) {
      var ancestors = getAncestorsAndSelf(node);
      for (var i = 0, len = ancestors.length;i < len;++i) {
        if (ancestors[i].nodeType == 1 && getComputedDisplay(ancestors[i]) == "none") {
          return true;
        }
      }
      return false;
    }
    function isVisibilityHiddenTextNode(textNode) {
      var el;
      return textNode.nodeType == 3 && (el = textNode.parentNode) && getComputedStyleProperty(el, "visibility") == "hidden";
    }
    function isBlockNode(node) {
      return node && (node.nodeType == 1 && !/^(inline(-block|-table)?|none)$/.test(getComputedDisplay(node)) || node.nodeType == 9 || node.nodeType == 11);
    }
    function getLastDescendantOrSelf(node) {
      var lastChild = node.lastChild;
      return lastChild ? getLastDescendantOrSelf(lastChild) : node;
    }
    function containsPositions(node) {
      return dom.isCharacterDataNode(node) || !/^(area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i.test(node.nodeName);
    }
    function getAncestors(node) {
      var ancestors = [];
      while (node.parentNode) {
        ancestors.unshift(node.parentNode);
        node = node.parentNode;
      }
      return ancestors;
    }
    function getAncestorsAndSelf(node) {
      return getAncestors(node).concat([node]);
    }
    function nextNodeDescendants(node) {
      while (node && !node.nextSibling) {
        node = node.parentNode;
      }
      if (!node) {
        return null;
      }
      return node.nextSibling;
    }
    function nextNode(node, excludeChildren) {
      if (!excludeChildren && node.hasChildNodes()) {
        return node.firstChild;
      }
      return nextNodeDescendants(node);
    }
    function previousNode(node) {
      var previous = node.previousSibling;
      if (previous) {
        node = previous;
        while (node.hasChildNodes()) {
          node = node.lastChild;
        }
        return node;
      }
      var parent = node.parentNode;
      if (parent && parent.nodeType == 1) {
        return parent;
      }
      return null;
    }
    function isWhitespaceNode(node) {
      if (!node || node.nodeType != 3) {
        return false;
      }
      var text = node.data;
      if (text === "") {
        return true;
      }
      var parent = node.parentNode;
      if (!parent || parent.nodeType != 1) {
        return false;
      }
      var computedWhiteSpace = getComputedStyleProperty(node.parentNode, "whiteSpace");
      return/^[\t\n\r ]+$/.test(text) && /^(normal|nowrap)$/.test(computedWhiteSpace) || /^[\t\r ]+$/.test(text) && computedWhiteSpace == "pre-line";
    }
    function isCollapsedWhitespaceNode(node) {
      if (node.data === "") {
        return true;
      }
      if (!isWhitespaceNode(node)) {
        return false;
      }
      var ancestor = node.parentNode;
      if (!ancestor) {
        return true;
      }
      if (isHidden(node)) {
        return true;
      }
      return false;
    }
    function isCollapsedNode(node) {
      var type = node.nodeType;
      return type == 7 || type == 8 || isHidden(node) || /^(script|style)$/i.test(node.nodeName) || isVisibilityHiddenTextNode(node) || isCollapsedWhitespaceNode(node);
    }
    function isIgnoredNode(node, win) {
      var type = node.nodeType;
      return type == 7 || type == 8 || type == 1 && getComputedDisplay(node, win) == "none";
    }
    function Cache() {
      this.store = {};
    }
    Cache.prototype = {get:function(key) {
      return this.store.hasOwnProperty(key) ? this.store[key] : null;
    }, set:function(key, value) {
      return this.store[key] = value;
    }};
    var cachedCount = 0, uncachedCount = 0;
    function createCachingGetter(methodName, func, objProperty) {
      return function(args) {
        var cache = this.cache;
        if (cache.hasOwnProperty(methodName)) {
          cachedCount++;
          return cache[methodName];
        } else {
          uncachedCount++;
          var value = func.call(this, objProperty ? this[objProperty] : this, args);
          cache[methodName] = value;
          return value;
        }
      };
    }
    function NodeWrapper(node, session) {
      this.node = node;
      this.session = session;
      this.cache = new Cache;
      this.positions = new Cache;
    }
    var nodeProto = {getPosition:function(offset) {
      var positions = this.positions;
      return positions.get(offset) || positions.set(offset, new Position(this, offset));
    }, toString:function() {
      return "[NodeWrapper(" + dom.inspectNode(this.node) + ")]";
    }};
    NodeWrapper.prototype = nodeProto;
    var EMPTY = "EMPTY", NON_SPACE = "NON_SPACE", UNCOLLAPSIBLE_SPACE = "UNCOLLAPSIBLE_SPACE", COLLAPSIBLE_SPACE = "COLLAPSIBLE_SPACE", TRAILING_SPACE_BEFORE_BLOCK = "TRAILING_SPACE_BEFORE_BLOCK", TRAILING_SPACE_IN_BLOCK = "TRAILING_SPACE_IN_BLOCK", TRAILING_SPACE_BEFORE_BR = "TRAILING_SPACE_BEFORE_BR", PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK = "PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK", TRAILING_LINE_BREAK_AFTER_BR = "TRAILING_LINE_BREAK_AFTER_BR";
    extend(nodeProto, {isCharacterDataNode:createCachingGetter("isCharacterDataNode", dom.isCharacterDataNode, "node"), getNodeIndex:createCachingGetter("nodeIndex", dom.getNodeIndex, "node"), getLength:createCachingGetter("nodeLength", dom.getNodeLength, "node"), containsPositions:createCachingGetter("containsPositions", containsPositions, "node"), isWhitespace:createCachingGetter("isWhitespace", isWhitespaceNode, "node"), isCollapsedWhitespace:createCachingGetter("isCollapsedWhitespace", isCollapsedWhitespaceNode, 
    "node"), getComputedDisplay:createCachingGetter("computedDisplay", getComputedDisplay, "node"), isCollapsed:createCachingGetter("collapsed", isCollapsedNode, "node"), isIgnored:createCachingGetter("ignored", isIgnoredNode, "node"), next:createCachingGetter("nextPos", nextNode, "node"), previous:createCachingGetter("previous", previousNode, "node"), getTextNodeInfo:createCachingGetter("textNodeInfo", function(textNode) {
      var spaceRegex = null, collapseSpaces = false;
      var cssWhitespace = getComputedStyleProperty(textNode.parentNode, "whiteSpace");
      var preLine = cssWhitespace == "pre-line";
      if (preLine) {
        spaceRegex = spacesMinusLineBreaksRegex;
        collapseSpaces = true;
      } else {
        if (cssWhitespace == "normal" || cssWhitespace == "nowrap") {
          spaceRegex = spacesRegex;
          collapseSpaces = true;
        }
      }
      return{node:textNode, text:textNode.data, spaceRegex:spaceRegex, collapseSpaces:collapseSpaces, preLine:preLine};
    }, "node"), hasInnerText:createCachingGetter("hasInnerText", function(el, backward) {
      var session = this.session;
      var posAfterEl = session.getPosition(el.parentNode, this.getNodeIndex() + 1);
      var firstPosInEl = session.getPosition(el, 0);
      var pos = backward ? posAfterEl : firstPosInEl;
      var endPos = backward ? firstPosInEl : posAfterEl;
      while (pos !== endPos) {
        pos.prepopulateChar();
        if (pos.isDefinitelyNonEmpty()) {
          return true;
        }
        pos = backward ? pos.previousVisible() : pos.nextVisible();
      }
      return false;
    }, "node"), isRenderedBlock:createCachingGetter("isRenderedBlock", function(el) {
      var brs = el.getElementsByTagName("br");
      for (var i = 0, len = brs.length;i < len;++i) {
        if (!isCollapsedNode(brs[i])) {
          return true;
        }
      }
      return this.hasInnerText();
    }, "node"), getTrailingSpace:createCachingGetter("trailingSpace", function(el) {
      if (el.tagName.toLowerCase() == "br") {
        return "";
      } else {
        switch(this.getComputedDisplay()) {
          case "inline":
            var child = el.lastChild;
            while (child) {
              if (!isIgnoredNode(child)) {
                return child.nodeType == 1 ? this.session.getNodeWrapper(child).getTrailingSpace() : "";
              }
              child = child.previousSibling;
            }
            break;
          case "inline-block":
          ;
          case "inline-table":
          ;
          case "none":
          ;
          case "table-column":
          ;
          case "table-column-group":
            break;
          case "table-cell":
            return "\t";
          default:
            return this.isRenderedBlock(true) ? "\n" : "";
        }
      }
      return "";
    }, "node"), getLeadingSpace:createCachingGetter("leadingSpace", function(el) {
      switch(this.getComputedDisplay()) {
        case "inline":
        ;
        case "inline-block":
        ;
        case "inline-table":
        ;
        case "none":
        ;
        case "table-column":
        ;
        case "table-column-group":
        ;
        case "table-cell":
          break;
        default:
          return this.isRenderedBlock(false) ? "\n" : "";
      }
      return "";
    }, "node")});
    function Position(nodeWrapper, offset) {
      this.offset = offset;
      this.nodeWrapper = nodeWrapper;
      this.node = nodeWrapper.node;
      this.session = nodeWrapper.session;
      this.cache = new Cache;
    }
    function inspectPosition() {
      return "[Position(" + dom.inspectNode(this.node) + ":" + this.offset + ")]";
    }
    var positionProto = {character:"", characterType:EMPTY, isBr:false, prepopulateChar:function() {
      var pos = this;
      if (!pos.prepopulatedChar) {
        var node = pos.node, offset = pos.offset;
        var visibleChar = "", charType = EMPTY;
        var finalizedChar = false;
        if (offset > 0) {
          if (node.nodeType == 3) {
            var text = node.data;
            var textChar = text.charAt(offset - 1);
            var nodeInfo = pos.nodeWrapper.getTextNodeInfo();
            var spaceRegex = nodeInfo.spaceRegex;
            if (nodeInfo.collapseSpaces) {
              if (spaceRegex.test(textChar)) {
                if (offset > 1 && spaceRegex.test(text.charAt(offset - 2))) {
                } else {
                  if (nodeInfo.preLine && text.charAt(offset) === "\n") {
                    visibleChar = " ";
                    charType = PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK;
                  } else {
                    visibleChar = " ";
                    charType = COLLAPSIBLE_SPACE;
                  }
                }
              } else {
                visibleChar = textChar;
                charType = NON_SPACE;
                finalizedChar = true;
              }
            } else {
              visibleChar = textChar;
              charType = UNCOLLAPSIBLE_SPACE;
              finalizedChar = true;
            }
          } else {
            var nodePassed = node.childNodes[offset - 1];
            if (nodePassed && nodePassed.nodeType == 1 && !isCollapsedNode(nodePassed)) {
              if (nodePassed.tagName.toLowerCase() == "br") {
                visibleChar = "\n";
                pos.isBr = true;
                charType = COLLAPSIBLE_SPACE;
                finalizedChar = false;
              } else {
                pos.checkForTrailingSpace = true;
              }
            }
            if (!visibleChar) {
              var nextNode = node.childNodes[offset];
              if (nextNode && nextNode.nodeType == 1 && !isCollapsedNode(nextNode)) {
                pos.checkForLeadingSpace = true;
              }
            }
          }
        }
        pos.prepopulatedChar = true;
        pos.character = visibleChar;
        pos.characterType = charType;
        pos.isCharInvariant = finalizedChar;
      }
    }, isDefinitelyNonEmpty:function() {
      var charType = this.characterType;
      return charType == NON_SPACE || charType == UNCOLLAPSIBLE_SPACE;
    }, resolveLeadingAndTrailingSpaces:function() {
      if (!this.prepopulatedChar) {
        this.prepopulateChar();
      }
      if (this.checkForTrailingSpace) {
        var trailingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset - 1]).getTrailingSpace();
        if (trailingSpace) {
          this.isTrailingSpace = true;
          this.character = trailingSpace;
          this.characterType = COLLAPSIBLE_SPACE;
        }
        this.checkForTrailingSpace = false;
      }
      if (this.checkForLeadingSpace) {
        var leadingSpace = this.session.getNodeWrapper(this.node.childNodes[this.offset]).getLeadingSpace();
        if (leadingSpace) {
          this.isLeadingSpace = true;
          this.character = leadingSpace;
          this.characterType = COLLAPSIBLE_SPACE;
        }
        this.checkForLeadingSpace = false;
      }
    }, getPrecedingUncollapsedPosition:function(characterOptions) {
      var pos = this, character;
      while (pos = pos.previousVisible()) {
        character = pos.getCharacter(characterOptions);
        if (character !== "") {
          return pos;
        }
      }
      return null;
    }, getCharacter:function(characterOptions) {
      this.resolveLeadingAndTrailingSpaces();
      var thisChar = this.character, returnChar;
      var ignoredChars = normalizeIgnoredCharacters(characterOptions.ignoreCharacters);
      var isIgnoredCharacter = thisChar !== "" && ignoredChars.indexOf(thisChar) > -1;
      if (this.isCharInvariant) {
        returnChar = isIgnoredCharacter ? "" : thisChar;
        return returnChar;
      }
      var cacheKey = ["character", characterOptions.includeSpaceBeforeBr, characterOptions.includeBlockContentTrailingSpace, characterOptions.includePreLineTrailingSpace, ignoredChars].join("_");
      var cachedChar = this.cache.get(cacheKey);
      if (cachedChar !== null) {
        return cachedChar;
      }
      var character = "";
      var collapsible = this.characterType == COLLAPSIBLE_SPACE;
      var nextPos, previousPos;
      var gotPreviousPos = false;
      var pos = this;
      function getPreviousPos() {
        if (!gotPreviousPos) {
          previousPos = pos.getPrecedingUncollapsedPosition(characterOptions);
          gotPreviousPos = true;
        }
        return previousPos;
      }
      if (collapsible) {
        if (thisChar == " " && (!getPreviousPos() || previousPos.isTrailingSpace || previousPos.character == "\n")) {
        } else {
          if (thisChar == "\n" && this.isLeadingSpace) {
            if (getPreviousPos() && previousPos.character != "\n") {
              character = "\n";
            } else {
            }
          } else {
            nextPos = this.nextUncollapsed();
            if (nextPos) {
              if (nextPos.isBr) {
                this.type = TRAILING_SPACE_BEFORE_BR;
              } else {
                if (nextPos.isTrailingSpace && nextPos.character == "\n") {
                  this.type = TRAILING_SPACE_IN_BLOCK;
                } else {
                  if (nextPos.isLeadingSpace && nextPos.character == "\n") {
                    this.type = TRAILING_SPACE_BEFORE_BLOCK;
                  }
                }
              }
              if (nextPos.character == "\n") {
                if (this.type == TRAILING_SPACE_BEFORE_BR && !characterOptions.includeSpaceBeforeBr) {
                } else {
                  if (this.type == TRAILING_SPACE_BEFORE_BLOCK && !characterOptions.includeSpaceBeforeBlock) {
                  } else {
                    if (this.type == TRAILING_SPACE_IN_BLOCK && nextPos.isTrailingSpace && !characterOptions.includeBlockContentTrailingSpace) {
                    } else {
                      if (this.type == PRE_LINE_TRAILING_SPACE_BEFORE_LINE_BREAK && nextPos.type == NON_SPACE && !characterOptions.includePreLineTrailingSpace) {
                      } else {
                        if (thisChar == "\n") {
                          if (nextPos.isTrailingSpace) {
                            if (this.isTrailingSpace) {
                            } else {
                              if (this.isBr) {
                                nextPos.type = TRAILING_LINE_BREAK_AFTER_BR;
                                if (getPreviousPos() && previousPos.isLeadingSpace && previousPos.character == "\n") {
                                  nextPos.character = "";
                                } else {
                                }
                              }
                            }
                          } else {
                            character = "\n";
                          }
                        } else {
                          if (thisChar == " ") {
                            character = " ";
                          } else {
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                character = thisChar;
              }
            } else {
            }
          }
        }
      } else {
        if (thisChar == "\n" && (!(nextPos = this.nextUncollapsed()) || nextPos.isTrailingSpace)) {
        }
      }
      if (ignoredChars.indexOf(character) > -1) {
        character = "";
      }
      this.cache.set(cacheKey, character);
      return character;
    }, equals:function(pos) {
      return!!pos && this.node === pos.node && this.offset === pos.offset;
    }, inspect:inspectPosition, toString:function() {
      return this.character;
    }};
    Position.prototype = positionProto;
    extend(positionProto, {next:createCachingGetter("nextPos", function(pos) {
      var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
      if (!node) {
        return null;
      }
      var nextNode, nextOffset, child;
      if (offset == nodeWrapper.getLength()) {
        nextNode = node.parentNode;
        nextOffset = nextNode ? nodeWrapper.getNodeIndex() + 1 : 0;
      } else {
        if (nodeWrapper.isCharacterDataNode()) {
          nextNode = node;
          nextOffset = offset + 1;
        } else {
          child = node.childNodes[offset];
          if (session.getNodeWrapper(child).containsPositions()) {
            nextNode = child;
            nextOffset = 0;
          } else {
            nextNode = node;
            nextOffset = offset + 1;
          }
        }
      }
      return nextNode ? session.getPosition(nextNode, nextOffset) : null;
    }), previous:createCachingGetter("previous", function(pos) {
      var nodeWrapper = pos.nodeWrapper, node = pos.node, offset = pos.offset, session = nodeWrapper.session;
      var previousNode, previousOffset, child;
      if (offset == 0) {
        previousNode = node.parentNode;
        previousOffset = previousNode ? nodeWrapper.getNodeIndex() : 0;
      } else {
        if (nodeWrapper.isCharacterDataNode()) {
          previousNode = node;
          previousOffset = offset - 1;
        } else {
          child = node.childNodes[offset - 1];
          if (session.getNodeWrapper(child).containsPositions()) {
            previousNode = child;
            previousOffset = dom.getNodeLength(child);
          } else {
            previousNode = node;
            previousOffset = offset - 1;
          }
        }
      }
      return previousNode ? session.getPosition(previousNode, previousOffset) : null;
    }), nextVisible:createCachingGetter("nextVisible", function(pos) {
      var next = pos.next();
      if (!next) {
        return null;
      }
      var nodeWrapper = next.nodeWrapper, node = next.node;
      var newPos = next;
      if (nodeWrapper.isCollapsed()) {
        newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex() + 1);
      }
      return newPos;
    }), nextUncollapsed:createCachingGetter("nextUncollapsed", function(pos) {
      var nextPos = pos;
      while (nextPos = nextPos.nextVisible()) {
        nextPos.resolveLeadingAndTrailingSpaces();
        if (nextPos.character !== "") {
          return nextPos;
        }
      }
      return null;
    }), previousVisible:createCachingGetter("previousVisible", function(pos) {
      var previous = pos.previous();
      if (!previous) {
        return null;
      }
      var nodeWrapper = previous.nodeWrapper, node = previous.node;
      var newPos = previous;
      if (nodeWrapper.isCollapsed()) {
        newPos = nodeWrapper.session.getPosition(node.parentNode, nodeWrapper.getNodeIndex());
      }
      return newPos;
    })});
    var currentSession = null;
    var Session = function() {
      function createWrapperCache(nodeProperty) {
        var cache = new Cache;
        return{get:function(node) {
          var wrappersByProperty = cache.get(node[nodeProperty]);
          if (wrappersByProperty) {
            for (var i = 0, wrapper;wrapper = wrappersByProperty[i++];) {
              if (wrapper.node === node) {
                return wrapper;
              }
            }
          }
          return null;
        }, set:function(nodeWrapper) {
          var property = nodeWrapper.node[nodeProperty];
          var wrappersByProperty = cache.get(property) || cache.set(property, []);
          wrappersByProperty.push(nodeWrapper);
        }};
      }
      var uniqueIDSupported = util.isHostProperty(document.documentElement, "uniqueID");
      function Session() {
        this.initCaches();
      }
      Session.prototype = {initCaches:function() {
        this.elementCache = uniqueIDSupported ? function() {
          var elementsCache = new Cache;
          return{get:function(el) {
            return elementsCache.get(el.uniqueID);
          }, set:function(elWrapper) {
            elementsCache.set(elWrapper.node.uniqueID, elWrapper);
          }};
        }() : createWrapperCache("tagName");
        this.textNodeCache = createWrapperCache("data");
        this.otherNodeCache = createWrapperCache("nodeName");
      }, getNodeWrapper:function(node) {
        var wrapperCache;
        switch(node.nodeType) {
          case 1:
            wrapperCache = this.elementCache;
            break;
          case 3:
            wrapperCache = this.textNodeCache;
            break;
          default:
            wrapperCache = this.otherNodeCache;
            break;
        }
        var wrapper = wrapperCache.get(node);
        if (!wrapper) {
          wrapper = new NodeWrapper(node, this);
          wrapperCache.set(wrapper);
        }
        return wrapper;
      }, getPosition:function(node, offset) {
        return this.getNodeWrapper(node).getPosition(offset);
      }, getRangeBoundaryPosition:function(range, isStart) {
        var prefix = isStart ? "start" : "end";
        return this.getPosition(range[prefix + "Container"], range[prefix + "Offset"]);
      }, detach:function() {
        this.elementCache = this.textNodeCache = this.otherNodeCache = null;
      }};
      return Session;
    }();
    function startSession() {
      endSession();
      return currentSession = new Session;
    }
    function getSession() {
      return currentSession || startSession();
    }
    function endSession() {
      if (currentSession) {
        currentSession.detach();
      }
      currentSession = null;
    }
    extend(dom, {nextNode:nextNode, previousNode:previousNode});
    function createCharacterIterator(startPos, backward, endPos, characterOptions) {
      if (endPos) {
        if (backward) {
          if (isCollapsedNode(endPos.node)) {
            endPos = startPos.previousVisible();
          }
        } else {
          if (isCollapsedNode(endPos.node)) {
            endPos = endPos.nextVisible();
          }
        }
      }
      var pos = startPos, finished = false;
      function next() {
        var charPos = null;
        if (backward) {
          charPos = pos;
          if (!finished) {
            pos = pos.previousVisible();
            finished = !pos || endPos && pos.equals(endPos);
          }
        } else {
          if (!finished) {
            charPos = pos = pos.nextVisible();
            finished = !pos || endPos && pos.equals(endPos);
          }
        }
        if (finished) {
          pos = null;
        }
        return charPos;
      }
      var previousTextPos, returnPreviousTextPos = false;
      return{next:function() {
        if (returnPreviousTextPos) {
          returnPreviousTextPos = false;
          return previousTextPos;
        } else {
          var pos, character;
          while (pos = next()) {
            character = pos.getCharacter(characterOptions);
            if (character) {
              previousTextPos = pos;
              return pos;
            }
          }
          return null;
        }
      }, rewind:function() {
        if (previousTextPos) {
          returnPreviousTextPos = true;
        } else {
          throw module.createError("createCharacterIterator: cannot rewind. Only one position can be rewound.");
        }
      }, dispose:function() {
        startPos = endPos = null;
      }};
    }
    var arrayIndexOf = Array.prototype.indexOf ? function(arr, val) {
      return arr.indexOf(val);
    } : function(arr, val) {
      for (var i = 0, len = arr.length;i < len;++i) {
        if (arr[i] === val) {
          return i;
        }
      }
      return-1;
    };
    function createTokenizedTextProvider(pos, characterOptions, wordOptions) {
      var forwardIterator = createCharacterIterator(pos, false, null, characterOptions);
      var backwardIterator = createCharacterIterator(pos, true, null, characterOptions);
      var tokenizer = wordOptions.tokenizer;
      function consumeWord(forward) {
        var pos, textChar;
        var newChars = [], it = forward ? forwardIterator : backwardIterator;
        var passedWordBoundary = false, insideWord = false;
        while (pos = it.next()) {
          textChar = pos.character;
          if (allWhiteSpaceRegex.test(textChar)) {
            if (insideWord) {
              insideWord = false;
              passedWordBoundary = true;
            }
          } else {
            if (passedWordBoundary) {
              it.rewind();
              break;
            } else {
              insideWord = true;
            }
          }
          newChars.push(pos);
        }
        return newChars;
      }
      var forwardChars = consumeWord(true);
      var backwardChars = consumeWord(false).reverse();
      var tokens = tokenizer(backwardChars.concat(forwardChars), wordOptions);
      var forwardTokensBuffer = forwardChars.length ? tokens.slice(arrayIndexOf(tokens, forwardChars[0].token)) : [];
      var backwardTokensBuffer = backwardChars.length ? tokens.slice(0, arrayIndexOf(tokens, backwardChars.pop().token) + 1) : [];
      function inspectBuffer(buffer) {
        var textPositions = ["[" + buffer.length + "]"];
        for (var i = 0;i < buffer.length;++i) {
          textPositions.push("(word: " + buffer[i] + ", is word: " + buffer[i].isWord + ")");
        }
        return textPositions;
      }
      return{nextEndToken:function() {
        var lastToken, forwardChars;
        while (forwardTokensBuffer.length == 1 && !(lastToken = forwardTokensBuffer[0]).isWord && (forwardChars = consumeWord(true)).length > 0) {
          forwardTokensBuffer = tokenizer(lastToken.chars.concat(forwardChars), wordOptions);
        }
        return forwardTokensBuffer.shift();
      }, previousStartToken:function() {
        var lastToken, backwardChars;
        while (backwardTokensBuffer.length == 1 && !(lastToken = backwardTokensBuffer[0]).isWord && (backwardChars = consumeWord(false)).length > 0) {
          backwardTokensBuffer = tokenizer(backwardChars.reverse().concat(lastToken.chars), wordOptions);
        }
        return backwardTokensBuffer.pop();
      }, dispose:function() {
        forwardIterator.dispose();
        backwardIterator.dispose();
        forwardTokensBuffer = backwardTokensBuffer = null;
      }};
    }
    function movePositionBy(pos, unit, count, characterOptions, wordOptions) {
      var unitsMoved = 0, currentPos, newPos = pos, charIterator, nextPos, absCount = Math.abs(count), token;
      if (count !== 0) {
        var backward = count < 0;
        switch(unit) {
          case CHARACTER:
            charIterator = createCharacterIterator(pos, backward, null, characterOptions);
            while ((currentPos = charIterator.next()) && unitsMoved < absCount) {
              ++unitsMoved;
              newPos = currentPos;
            }
            nextPos = currentPos;
            charIterator.dispose();
            break;
          case WORD:
            var tokenizedTextProvider = createTokenizedTextProvider(pos, characterOptions, wordOptions);
            var next = backward ? tokenizedTextProvider.previousStartToken : tokenizedTextProvider.nextEndToken;
            while ((token = next()) && unitsMoved < absCount) {
              if (token.isWord) {
                ++unitsMoved;
                newPos = backward ? token.chars[0] : token.chars[token.chars.length - 1];
              }
            }
            break;
          default:
            throw new Error("movePositionBy: unit '" + unit + "' not implemented");;
        }
        if (backward) {
          newPos = newPos.previousVisible();
          unitsMoved = -unitsMoved;
        } else {
          if (newPos && newPos.isLeadingSpace) {
            if (unit == WORD) {
              charIterator = createCharacterIterator(pos, false, null, characterOptions);
              nextPos = charIterator.next();
              charIterator.dispose();
            }
            if (nextPos) {
              newPos = nextPos.previousVisible();
            }
          }
        }
      }
      return{position:newPos, unitsMoved:unitsMoved};
    }
    function createRangeCharacterIterator(session, range, characterOptions, backward) {
      var rangeStart = session.getRangeBoundaryPosition(range, true);
      var rangeEnd = session.getRangeBoundaryPosition(range, false);
      var itStart = backward ? rangeEnd : rangeStart;
      var itEnd = backward ? rangeStart : rangeEnd;
      return createCharacterIterator(itStart, !!backward, itEnd, characterOptions);
    }
    function getRangeCharacters(session, range, characterOptions) {
      var chars = [], it = createRangeCharacterIterator(session, range, characterOptions), pos;
      while (pos = it.next()) {
        chars.push(pos);
      }
      it.dispose();
      return chars;
    }
    function isWholeWord(startPos, endPos, wordOptions) {
      var range = api.createRange(startPos.node);
      range.setStartAndEnd(startPos.node, startPos.offset, endPos.node, endPos.offset);
      var returnVal = !range.expand("word", wordOptions);
      return returnVal;
    }
    function findTextFromPosition(initialPos, searchTerm, isRegex, searchScopeRange, findOptions) {
      var backward = isDirectionBackward(findOptions.direction);
      var it = createCharacterIterator(initialPos, backward, initialPos.session.getRangeBoundaryPosition(searchScopeRange, backward), findOptions.characterOptions);
      var text = "", chars = [], pos, currentChar, matchStartIndex, matchEndIndex;
      var result, insideRegexMatch;
      var returnValue = null;
      function handleMatch(startIndex, endIndex) {
        var startPos = chars[startIndex].previousVisible();
        var endPos = chars[endIndex - 1];
        var valid = !findOptions.wholeWordsOnly || isWholeWord(startPos, endPos, findOptions.wordOptions);
        return{startPos:startPos, endPos:endPos, valid:valid};
      }
      while (pos = it.next()) {
        currentChar = pos.character;
        if (!isRegex && !findOptions.caseSensitive) {
          currentChar = currentChar.toLowerCase();
        }
        if (backward) {
          chars.unshift(pos);
          text = currentChar + text;
        } else {
          chars.push(pos);
          text += currentChar;
        }
        if (isRegex) {
          result = searchTerm.exec(text);
          if (result) {
            matchStartIndex = result.index;
            matchEndIndex = matchStartIndex + result[0].length;
            if (insideRegexMatch) {
              if (!backward && matchEndIndex < text.length || backward && matchStartIndex > 0) {
                returnValue = handleMatch(matchStartIndex, matchEndIndex);
                break;
              }
            } else {
              insideRegexMatch = true;
            }
          }
        } else {
          if ((matchStartIndex = text.indexOf(searchTerm)) != -1) {
            returnValue = handleMatch(matchStartIndex, matchStartIndex + searchTerm.length);
            break;
          }
        }
      }
      if (insideRegexMatch) {
        returnValue = handleMatch(matchStartIndex, matchEndIndex);
      }
      it.dispose();
      return returnValue;
    }
    function createEntryPointFunction(func) {
      return function() {
        var sessionRunning = !!currentSession;
        var session = getSession();
        var args = [session].concat(util.toArray(arguments));
        var returnValue = func.apply(this, args);
        if (!sessionRunning) {
          endSession();
        }
        return returnValue;
      };
    }
    function createRangeBoundaryMover(isStart, collapse) {
      return createEntryPointFunction(function(session, unit, count, moveOptions) {
        if (typeof count == UNDEF) {
          count = unit;
          unit = CHARACTER;
        }
        moveOptions = createNestedOptions(moveOptions, defaultMoveOptions);
        var boundaryIsStart = isStart;
        if (collapse) {
          boundaryIsStart = count >= 0;
          this.collapse(!boundaryIsStart);
        }
        var moveResult = movePositionBy(session.getRangeBoundaryPosition(this, boundaryIsStart), unit, count, moveOptions.characterOptions, moveOptions.wordOptions);
        var newPos = moveResult.position;
        this[boundaryIsStart ? "setStart" : "setEnd"](newPos.node, newPos.offset);
        return moveResult.unitsMoved;
      });
    }
    function createRangeTrimmer(isStart) {
      return createEntryPointFunction(function(session, characterOptions) {
        characterOptions = createOptions(characterOptions, defaultCharacterOptions);
        var pos;
        var it = createRangeCharacterIterator(session, this, characterOptions, !isStart);
        var trimCharCount = 0;
        while ((pos = it.next()) && allWhiteSpaceRegex.test(pos.character)) {
          ++trimCharCount;
        }
        it.dispose();
        var trimmed = trimCharCount > 0;
        if (trimmed) {
          this[isStart ? "moveStart" : "moveEnd"]("character", isStart ? trimCharCount : -trimCharCount, {characterOptions:characterOptions});
        }
        return trimmed;
      });
    }
    extend(api.rangePrototype, {moveStart:createRangeBoundaryMover(true, false), moveEnd:createRangeBoundaryMover(false, false), move:createRangeBoundaryMover(true, true), trimStart:createRangeTrimmer(true), trimEnd:createRangeTrimmer(false), trim:createEntryPointFunction(function(session, characterOptions) {
      var startTrimmed = this.trimStart(characterOptions), endTrimmed = this.trimEnd(characterOptions);
      return startTrimmed || endTrimmed;
    }), expand:createEntryPointFunction(function(session, unit, expandOptions) {
      var moved = false;
      expandOptions = createNestedOptions(expandOptions, defaultExpandOptions);
      var characterOptions = expandOptions.characterOptions;
      if (!unit) {
        unit = CHARACTER;
      }
      if (unit == WORD) {
        var wordOptions = expandOptions.wordOptions;
        var startPos = session.getRangeBoundaryPosition(this, true);
        var endPos = session.getRangeBoundaryPosition(this, false);
        var startTokenizedTextProvider = createTokenizedTextProvider(startPos, characterOptions, wordOptions);
        var startToken = startTokenizedTextProvider.nextEndToken();
        var newStartPos = startToken.chars[0].previousVisible();
        var endToken, newEndPos;
        if (this.collapsed) {
          endToken = startToken;
        } else {
          var endTokenizedTextProvider = createTokenizedTextProvider(endPos, characterOptions, wordOptions);
          endToken = endTokenizedTextProvider.previousStartToken();
        }
        newEndPos = endToken.chars[endToken.chars.length - 1];
        if (!newStartPos.equals(startPos)) {
          this.setStart(newStartPos.node, newStartPos.offset);
          moved = true;
        }
        if (newEndPos && !newEndPos.equals(endPos)) {
          this.setEnd(newEndPos.node, newEndPos.offset);
          moved = true;
        }
        if (expandOptions.trim) {
          if (expandOptions.trimStart) {
            moved = this.trimStart(characterOptions) || moved;
          }
          if (expandOptions.trimEnd) {
            moved = this.trimEnd(characterOptions) || moved;
          }
        }
        return moved;
      } else {
        return this.moveEnd(CHARACTER, 1, expandOptions);
      }
    }), text:createEntryPointFunction(function(session, characterOptions) {
      return this.collapsed ? "" : getRangeCharacters(session, this, createOptions(characterOptions, defaultCharacterOptions)).join("");
    }), selectCharacters:createEntryPointFunction(function(session, containerNode, startIndex, endIndex, characterOptions) {
      var moveOptions = {characterOptions:characterOptions};
      if (!containerNode) {
        containerNode = getBody(this.getDocument());
      }
      this.selectNodeContents(containerNode);
      this.collapse(true);
      this.moveStart("character", startIndex, moveOptions);
      this.collapse(true);
      this.moveEnd("character", endIndex - startIndex, moveOptions);
    }), toCharacterRange:createEntryPointFunction(function(session, containerNode, characterOptions) {
      if (!containerNode) {
        containerNode = getBody(this.getDocument());
      }
      var parent = containerNode.parentNode, nodeIndex = dom.getNodeIndex(containerNode);
      var rangeStartsBeforeNode = dom.comparePoints(this.startContainer, this.endContainer, parent, nodeIndex) == -1;
      var rangeBetween = this.cloneRange();
      var startIndex, endIndex;
      if (rangeStartsBeforeNode) {
        rangeBetween.setStartAndEnd(this.startContainer, this.startOffset, parent, nodeIndex);
        startIndex = -rangeBetween.text(characterOptions).length;
      } else {
        rangeBetween.setStartAndEnd(parent, nodeIndex, this.startContainer, this.startOffset);
        startIndex = rangeBetween.text(characterOptions).length;
      }
      endIndex = startIndex + this.text(characterOptions).length;
      return{start:startIndex, end:endIndex};
    }), findText:createEntryPointFunction(function(session, searchTermParam, findOptions) {
      findOptions = createNestedOptions(findOptions, defaultFindOptions);
      if (findOptions.wholeWordsOnly) {
        findOptions.wordOptions.includeTrailingSpace = false;
      }
      var backward = isDirectionBackward(findOptions.direction);
      var searchScopeRange = findOptions.withinRange;
      if (!searchScopeRange) {
        searchScopeRange = api.createRange();
        searchScopeRange.selectNodeContents(this.getDocument());
      }
      var searchTerm = searchTermParam, isRegex = false;
      if (typeof searchTerm == "string") {
        if (!findOptions.caseSensitive) {
          searchTerm = searchTerm.toLowerCase();
        }
      } else {
        isRegex = true;
      }
      var initialPos = session.getRangeBoundaryPosition(this, !backward);
      var comparison = searchScopeRange.comparePoint(initialPos.node, initialPos.offset);
      if (comparison === -1) {
        initialPos = session.getRangeBoundaryPosition(searchScopeRange, true);
      } else {
        if (comparison === 1) {
          initialPos = session.getRangeBoundaryPosition(searchScopeRange, false);
        }
      }
      var pos = initialPos;
      var wrappedAround = false;
      var findResult;
      while (true) {
        findResult = findTextFromPosition(pos, searchTerm, isRegex, searchScopeRange, findOptions);
        if (findResult) {
          if (findResult.valid) {
            this.setStartAndEnd(findResult.startPos.node, findResult.startPos.offset, findResult.endPos.node, findResult.endPos.offset);
            return true;
          } else {
            pos = backward ? findResult.startPos : findResult.endPos;
          }
        } else {
          if (findOptions.wrap && !wrappedAround) {
            searchScopeRange = searchScopeRange.cloneRange();
            pos = session.getRangeBoundaryPosition(searchScopeRange, !backward);
            searchScopeRange.setBoundary(initialPos.node, initialPos.offset, backward);
            wrappedAround = true;
          } else {
            return false;
          }
        }
      }
    }), pasteHtml:function(html) {
      this.deleteContents();
      if (html) {
        var frag = this.createContextualFragment(html);
        var lastChild = frag.lastChild;
        this.insertNode(frag);
        this.collapseAfter(lastChild);
      }
    }});
    function createSelectionTrimmer(methodName) {
      return createEntryPointFunction(function(session, characterOptions) {
        var trimmed = false;
        this.changeEachRange(function(range) {
          trimmed = range[methodName](characterOptions) || trimmed;
        });
        return trimmed;
      });
    }
    extend(api.selectionPrototype, {expand:createEntryPointFunction(function(session, unit, expandOptions) {
      this.changeEachRange(function(range) {
        range.expand(unit, expandOptions);
      });
    }), move:createEntryPointFunction(function(session, unit, count, options) {
      var unitsMoved = 0;
      if (this.focusNode) {
        this.collapse(this.focusNode, this.focusOffset);
        var range = this.getRangeAt(0);
        if (!options) {
          options = {};
        }
        options.characterOptions = createOptions(options.characterOptions, defaultCaretCharacterOptions);
        unitsMoved = range.move(unit, count, options);
        this.setSingleRange(range);
      }
      return unitsMoved;
    }), trimStart:createSelectionTrimmer("trimStart"), trimEnd:createSelectionTrimmer("trimEnd"), trim:createSelectionTrimmer("trim"), selectCharacters:createEntryPointFunction(function(session, containerNode, startIndex, endIndex, direction, characterOptions) {
      var range = api.createRange(containerNode);
      range.selectCharacters(containerNode, startIndex, endIndex, characterOptions);
      this.setSingleRange(range, direction);
    }), saveCharacterRanges:createEntryPointFunction(function(session, containerNode, characterOptions) {
      var ranges = this.getAllRanges(), rangeCount = ranges.length;
      var rangeInfos = [];
      var backward = rangeCount == 1 && this.isBackward();
      for (var i = 0, len = ranges.length;i < len;++i) {
        rangeInfos[i] = {characterRange:ranges[i].toCharacterRange(containerNode, characterOptions), backward:backward, characterOptions:characterOptions};
      }
      return rangeInfos;
    }), restoreCharacterRanges:createEntryPointFunction(function(session, containerNode, saved) {
      this.removeAllRanges();
      for (var i = 0, len = saved.length, range, rangeInfo, characterRange;i < len;++i) {
        rangeInfo = saved[i];
        characterRange = rangeInfo.characterRange;
        range = api.createRange(containerNode);
        range.selectCharacters(containerNode, characterRange.start, characterRange.end, rangeInfo.characterOptions);
        this.addRange(range, rangeInfo.backward);
      }
    }), text:createEntryPointFunction(function(session, characterOptions) {
      var rangeTexts = [];
      for (var i = 0, len = this.rangeCount;i < len;++i) {
        rangeTexts[i] = this.getRangeAt(i).text(characterOptions);
      }
      return rangeTexts.join("");
    })});
    api.innerText = function(el, characterOptions) {
      var range = api.createRange(el);
      range.selectNodeContents(el);
      var text = range.text(characterOptions);
      return text;
    };
    api.createWordIterator = function(startNode, startOffset, iteratorOptions) {
      var session = getSession();
      iteratorOptions = createNestedOptions(iteratorOptions, defaultWordIteratorOptions);
      var startPos = session.getPosition(startNode, startOffset);
      var tokenizedTextProvider = createTokenizedTextProvider(startPos, iteratorOptions.characterOptions, iteratorOptions.wordOptions);
      var backward = isDirectionBackward(iteratorOptions.direction);
      return{next:function() {
        return backward ? tokenizedTextProvider.previousStartToken() : tokenizedTextProvider.nextEndToken();
      }, dispose:function() {
        tokenizedTextProvider.dispose();
        this.next = function() {
        };
      }};
    };
    api.noMutation = function(func) {
      var session = getSession();
      func(session);
      endSession();
    };
    api.noMutation.createEntryPointFunction = createEntryPointFunction;
    api.textRange = {isBlockNode:isBlockNode, isCollapsedWhitespaceNode:isCollapsedWhitespaceNode, createPosition:createEntryPointFunction(function(session, node, offset) {
      return session.getPosition(node, offset);
    })};
  });
}, this);

