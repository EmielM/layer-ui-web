/**
 * The Layer Newline TextHandler replaces all newline characters with <br/> tags.
 *
 * Any newline character that appears within a code block should
 * NOT be replaced with a <br/> tag as the code block will render that as a visible
 * <br/> rather than go to the next line.
 *
 * @class layerUI.handlers.text.NewLine
 */
var layerUI = require('../../base');
layerUI.registerTextHandler({
  name: 'newline',
  order: 600,
  requiresEnable: true,
  handler: function(textData) {
    var body = textData.text;
    var codeBlockIndices = [];
    var codeBlocks = [];
    var lastIndex = 0;
    while (lastIndex !== -1) {
      lastIndex = body.indexOf('```', lastIndex);
      if (lastIndex !== -1) {
        codeBlockIndices.push(lastIndex);
        lastIndex += 3;
      }
    }

    for (var i = 1; i < codeBlockIndices.length; i++) {
      codeBlocks.push([codeBlockIndices[i - 1], codeBlockIndices[i]]);
    }

    function isInCodeBlock(index) {
      return Boolean(codeBlocks.filter(function(block) {return index > block[0] && index < block[1]}).length);
    }

    body = body.replace(/\n/g, function(text, index) {
      if (isInCodeBlock(index)) {
        return text;
      } else {
        return '<br/>';
      }
    });
    textData.text = body;
  }
});