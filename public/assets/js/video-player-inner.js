$(document).ready(function() {
  var videoPlayer = $('#video-player');
  var player = null;
  
  // Click event for play button
  $('#play-btn').click(function(event) {
    event.preventDefault();
    var videoId = $(this).data('video-id');
    if (player == null) {
      player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1
        },
        events: {
          'onReady': onPlayerReady
        }
      });
    } else {
      player.loadVideoById(videoId);
    }
    videoPlayer.show();
  });
  
  // Click event for close button
  $('#close-btn').click(function(event) {
    event.preventDefault();
    player.pauseVideo();
    videoPlayer.hide();
  });
  
  // Function to resize player on ready
  function onPlayerReady(event) {
    event.target.setSize($('#player').width(), $('#player').width() * 0.5625);
  }
});
