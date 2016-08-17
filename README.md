# blogger

This is how you'd compile:

java -jar third_party/compiler.jar --js_output_file=bin/kiwi.js --formatting=PRETTY_PRINT --compilation_level=WHITESPACE_ONLY third_party/rangy/lib/rangy-core.js third_party/rangy/lib/rangy-classapplier.js third_party/rangy/lib/rangy-selectionsaverestore.js third_party/rangy/lib/rangy-serializer.js third_party/rangy/lib/rangy-highlighter.js main.js
