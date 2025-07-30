$(document).ready(function() {
  var videoIndex = 0;
  
  // Click event for next button
  $('#next-btn').click(function(event) {
    event.preventDefault();
    videoIndex++;
    if (videoIndex > $('.video').length - 1) {
      videoIndex = 0;
    }
    $('.video.active').removeClass('active').animate({ opacity: 0 }, 500);
    $('.video').eq(videoIndex).addClass('active').animate({ opacity: 1 }, 500);
  });
  
  // Click event for previous button
  $('#prev-btn').click(function(event) {
    event.preventDefault();
    videoIndex--;
    if (videoIndex < 0
