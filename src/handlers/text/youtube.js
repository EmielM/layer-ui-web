/**
 * The Layer Youtube URL TextHandler replaces all youtube-like URLs with a video player.
 *
 * @class layerUI.handlers.text.Youtube
 */
var layerUI = require('../../base');
layerUI.registerTextHandler({
  name: 'youtube',
  order: 200,
  requiresEnable: true,
  handler: function(textData) {
    var matches = textData.text.match(/https:\/\/(www\.)?(youtu\.be|youtube\.com)\/(watch\?.*?v=)?([a-zA-Z0-9\-]+)/g);
    if (matches) {
      matches.forEach(function(match) {
        var videoId;
        var shortUrlMatches = match.match(/https:\/\/youtu\.be\/(.*)$/);
        if (shortUrlMatches) videoId = shortUrlMatches[1];
        if (!videoId) {
          var urlMatches = match.match(/https:\/\/www\.youtube\.com\/watch\?v\=(.*)$/);
          if (urlMatches) videoId = urlMatches[1];
        }
        if (videoId) {
          textData.afterText.push('<iframe width="560" height="315" src="https://www.youtube.com/embed/' + videoId + '" frameborder="0" allowfullscreen></iframe>');
        }
      });
    }
  }
});