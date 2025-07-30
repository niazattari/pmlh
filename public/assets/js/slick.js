$(document).ready(function() {
  $('.carousel').slick({
    arrows: true,
    autoplay: false,
  });
  var players = [];
  $('.carousel-slide').each(function(index) {
    var player = new YT.Player('player' + (index+1), {
      height: '100%',
      width: '100%',
      videoId: 'g9l2jBVch_w&t=86s',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        'onReady': function(event) {
          event.target.playVideo();
        },
        'onStateChange': function(event) {
          if (event.data === YT.PlayerState.ENDED) {
            $('.carousel').slick('slickNext');
          }
        }
      }
    });
    players.push(player);
  });
});
