goog.provide("rfc.Storage");

rfc.Storage = function() {
    this.cache_ = {};
}

rfc.Storage.prototype.load = function(callback) {
    var blob = decodeURIComponent(
	window.location.hash.slice(window.location.hash.indexOf("=") + 1));
    if (blob) {
	this.cache_ = JSON.parse(blob);
    }
    callback();
}

rfc.Storage.prototype.get = function(path, callback) {
    if (this.cache_[path]) {
	callback(200, this.cache_[path]);
	return;
    }
    callback(404);
}

rfc.Storage.prototype.commit_ = function() {
    window.location.hash = "highlights=" + encodeURIComponent(
        JSON.stringify(this.cache_));
}

rfc.Storage.prototype.post = function(path, payload, opt_callback) {
    this.cache_[path] = payload;
    this.commit_();
    var callback = opt_callback || function() {};
    callback(200, payload);
}
