
/**
 * Module dependencies.
 */

var express = require('express')
  , config = require('./config.js')
  , http = require('http')
  , fs = require('fs')
  , path = require('path')
  , request = require('request')
  , crypto = require('crypto');

var app = express();
var chatLogFile = fs.createWriteStream('./logs/chat.log', {flags: 'a'});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.use(express.logger({stream: chatLogFile}));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var users = {};//store user list
users.bot = 'BOT'; //add a BOT
app.get('/', function (req, res) {
  if (req.cookies.user == null) {
    res.redirect('/signin');
  } else {
    res.sendfile('views/index.html');
  }
});
app.get('/signin', function (req, res) {
  res.sendfile('views/signin.html');
});
app.post('/signin', function (req, res) {
  if (users[req.body.name]) {
    res.redirect('/signin');
  } else {
    res.cookie("user", req.body.name, {maxAge: 1000*60*60*24*30});
    res.redirect('/');
  }
});

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {

  //user online
  socket.on('online', function (data) {
    //store user datain socket for later process
    socket.name = data.user;
    if (!users[data.user]) {
      users[data.user] = data.user;
    }
    //broadcasting user online info
    io.sockets.emit('online', {users: users, user: data.user});
  });

  socket.on('say', function (data) {
    if (data.to == 'all') {
      socket.broadcast.emit('say', data);
	  if(config.botToAll){
		  var boturl = "http://api.program-o.com/v2.3.1/chatbot/?say="+data.msg+"&bot_id=6&convo_id="+crypto.createHash('md5').update('BOT').digest("hex");
		  
		  request(boturl, function (error, response, rdata) {
			var clients = io.sockets.clients();
				  clients.forEach(function (client) {
				  var t = JSON.parse(rdata);
				  data.from = 'BOT';
				  data.to = client.name;
				  data.msg = t.botsay;
				  data.say = t.usersay;
				  client.emit('say', data);
				  });
			});
		}
	  
    }else if(data.to == 'BOT'){
      var clients = io.sockets.clients();
      clients.forEach(function (client) {
        if (client.name == data.from) {
		  var boturl = "http://api.program-o.com/v2.3.1/chatbot/?say="+data.msg+"&bot_id=6&convo_id="+crypto.createHash('md5').update(client.name).digest("hex");
		  request(boturl, function (error, response, rdata) {
		  var t = JSON.parse(rdata);
		  data.from = 'BOT';
		  data.to = client.name;
		  data.msg = t.botsay;
		  data.say = t.usersay;
          client.emit('say', data);
		  });
        }
      });
	}else {
      //向特定用户发送该用户发话信息
      //clients 为存储所有连接对象的数组
      var clients = io.sockets.clients();
      //遍历找到该用户
      clients.forEach(function (client) {
        if (client.name == data.to) {
          //触发该用户客户端的 say 事件
          client.emit('say', data);
        }
      });
    }
  });

  //有人下线
  socket.on('disconnect', function() {
    //若 users 对象中保存了该用户名
    if (users[socket.name]) {
      //从 users 对象中删除该用户名
      delete users[socket.name];
      //向其他所有用户广播该用户下线信息
      socket.broadcast.emit('offline', {users: users, user: socket.name});
    }
  });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
