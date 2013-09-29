$(document).ready(function() {
  $(window).keydown(function (e) {
    if (e.keyCode == 116) {
      if (!confirm("Refressh will remove all chat messages, are you sure to do refresh?")) {
        e.preventDefault();
      }
    }
  });
  var socket = io.connect();
  var from = $.cookie('user');//read username from cookie
  var to = 'all';//default to 'all'
 
  socket.emit('online', {user: from});
  socket.on('online', function (data) {
  
    if (data.user != from) {
      var sys = '<div style="color:#f00">SYSTEM(' + now() + '):' + 'User ' + data.user + ' online now!</div>';
    } else {
      var sys = '<div style="color:#f00">SYSTEM(' + now() + '):You can chat now:)</div>';
    }
    $("#contents").append(sys + "<br/>");
    flushUsers(data.users);
    showSayTo();
  });

  socket.on('say', function (data) {
    if (data.to == 'all') {
      $("#contents").append('<div>' + data.from + '(' + now() + ')talks to all:<br/>' + data.msg + '</div><br />');
    }
    if (data.to == from) {
      $("#contents").append('<div style="color:#00f" >' + data.from + '(' + now() + ')talks to you：<br/>' + data.msg + '</div><br />');
    }
  });
  
  socket.on('offline', function (data) {

    var sys = '<div style="color:#f00">SYSTEM(' + now() + '):' + 'User ' + data.user + ' offline now!</div>';
    $("#contents").append(sys + "<br/>");

    flushUsers(data.users);

    if (data.user == to) {
      to = "all";
    }

    showSayTo();
  });


  socket.on('disconnect', function() {
    var sys = '<div style="color:#f00">SYSTEM:Failed to connect to server!</div>';
    $("#contents").append(sys + "<br/>");
    $("#list").empty();
  });

  socket.on('reconnect', function() {
    var sys = '<div style="color:#f00">SYSTEM:Reconnect to server!</div>';
    $("#contents").append(sys + "<br/>");
    socket.emit('online', {user: from});
  });


  function flushUsers(users) {

    $("#list").empty().append('<li title="DoubleClick to chat" alt="all" class="sayingto" onselectstart="return false">All</li>');

    for (var i in users) {
      $("#list").append('<li alt="' + users[i] + '" title="DoubleClick to chat" onselectstart="return false">' + users[i] + '</li>');
    }

    $("#list > li").dblclick(function() {
      if ($(this).attr('alt') != from) {
        to = $(this).attr('alt');
        $("#list > li").removeClass('sayingto');
        $(this).addClass('sayingto');
        showSayTo();
      }
    });
  }

  //Show who one talks to
  function showSayTo() {
    $("#from").html(from);
    $("#to").html(to == "all" ? "All" : to);
  }

  //get current time
  function now() {
    var date = new Date();
    var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()) + ":" + (date.getSeconds() < 10 ? ('0' + date.getSeconds()) : date.getSeconds());
    return time;
  }


  $("#say").click(function() {
    var $msg = $("#input_content").html();
    if (!$msg){ 
	  var sys = '<div style="color:#f00">SYSTEM: Please say something:)</div>';
      $("#contents").append(sys + "<br/>");
	  return;
	}

    if (to == "all") {
      $("#contents").append('<div>You(' + now() + ')talks to all：<br/>' + $msg + '</div><br />');
    } else {
      $("#contents").append('<div style="color:#00f" >You(' + now() + ')talks to ' + to + '：<br/>' + $msg + '</div><br />');
    }

    socket.emit('say', {from: from, to: to, msg: $msg});
    $("#input_content").html("").focus();
  });
});
