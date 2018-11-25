//Original: https://github.com/aszx87410/nodejs_simple_chatroom  licensed under ISC
const { spawn, exec } = require("child_process");
var app = require("express")(),
    http = require("http").Server(app),
    io = require("socket.io")(http),
    needle = require("needle"),
    unixTime = require("unix-time"),
    fs = require('fs'),
    central = require('socket.io-client')('http://127.0.0.1:81');

app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});

app.get("/jquery-3.3.1.min.js", function(req, res){
    res.sendFile(__dirname + "/jquery-3.3.1.min.js");
});

var users = [];
var recording = [[],[]]; //[[username],[pid]]
var mood1 = ["我想和你做朋友","你真可愛"]; //喜
var mood2 = ["我討厭你","你看起來很噁心","滾遠一點","滾開","渾蛋","你這個渾蛋","笨蛋","你這個笨蛋","你很煩耶","閉嘴"]; //怒
var mood3 = ["我們絕交吧","離我遠一點","你很煩人","煩死人了","你很吵耶"]; //哀
var mood4 = ["我喜歡你","今天你看起來很不錯"];  //樂
users.push(null,undefined,"bot","null","undefined","admin"); //黑名單
var TTSkey, LUISAppID, LUISkey;
var readytoidentify;
var lastname;

fs.readFile('secrets/TTSkey.txt', 'utf8', function(err, data) {
    if (err) throw err;
    TTSkey=data;
    console.log("Text to speech api key loaded");
});
fs.readFile('secrets/LUISAppID.txt', 'utf8', function(err, data) {
    if (err) throw err;
    LUISAppID=data;
    console.log("LUIS App ID loaded");
});
fs.readFile('secrets/LUISkey.txt', 'utf8', function(err, data) {
    if (err) throw err;
    LUISkey=data;
    console.log("LUIS key loaded");
});

var isSpeaking=false;


central.on("connect", function() {
    console.log("connected to central.");
});
central.on("disconnect", function() {
    console.log("disconnected to central.");
});

//當新的使用者連接進來的時候
io.on("connection", function(socket){
    central.emit("service",404);
    function speak(data) {
        let speaker = exec("speak.exe " + TTSkey + " " + data);
        speaker.on("close",function() {
            central.emit("service",501);
        });
    }
    var count=0;
    central.on("service",function(data) {
       console.log("central:  " + data);
       if (!io.sockets.connected[socket.id]) return;
       if (data==401) {
            socket.username = "guest"+Math.floor(Math.random()*10000);
            users.push(socket.username);
            io.sockets.connected[socket.id].emit("setnick",socket.username);
            readytoidentify=true;
       } else if (data==402) {           
           count++;
           console.log("這是我辨識到的第"+count+"個人");
           socket.emit("402");
           speak("您好，請問您有什麼事嗎?");
           socket.emit("chat message", {
                username:"iKaros",
                msg:"您好，請問您有什麼事嗎?"
            });
       } else if (data==403) {
           socket.emit("403");
           readytoidentify=false;
           console.log(socket.username + " left.");
            if (recording[0].includes(socket.username)) {
                var index = recording[0].indexOf(socket.username);
                exec("wmic process where (ParentProcessId=" + recording[1][index].pid + ") get Caption,ProcessId", (error, stdout, stderr) => {
                    exec("taskkill /T /f /pid " + stdout.split("\n")[1].replace("linco.exe","").replace(" ",""));
                });
                recording[1].splice(index,1);
                recording[0].splice(index,1);
            }
            if (users.includes(socket.username))
                users.splice(users.indexOf(socket.username),1);
       }
    });

    //監聽新訊息事件
    var dialogue=0;
    socket.on("chat message", function(msg){
        io.sockets.connected[socket.id].emit("chat message", {
            username:"You Sway",
            msg:msg
        });
        console.log("received:" + msg);
        if (socket.username=="undefined" || socket.username==undefined) {
            io.sockets.connected[socket.id].emit("server restarted", {
                msg:"Server Restarted."
            });
            return;
        }
        if (socket.username=="bot") return; else console.log(socket.username + " -> server : "+msg);
          //發佈新訊息
        if (recording[0].includes(socket.username)) {
            var index = recording[0].indexOf(socket.username);
            exec("wmic process where (ParentProcessId=" + recording[1][index].pid + ") get Caption,ProcessId", (error, stdout, stderr) => {
                exec("taskkill /T /f /pid " + stdout.split("\n")[1].replace("linco.exe","").replace(" ",""));
            });
            recording[1].splice(index,1);
            recording[0].splice(index,1);
        }
        
        io.sockets.connected[socket.id].emit("chat message", {
            username:socket.username,
            msg:msg
        });
        
        if (mood1.includes(msg)) {
            io.sockets.connected[socket.id].emit("chat message", {
                username:'iKaros',
                msg:"謝謝你，有你在真好!"
            });
            speak("謝謝你，有你在真好!");
            needle.post('http://(a_server_IP)/karos/UpMood.php', {form:{moodData:'1'}});
            return;
        }
        if (mood2.includes(msg)) {
            io.sockets.connected[socket.id].emit("chat message", {
                username:'iKaros',
                msg:"滾開，你個廢物!"
            });
            speak("謝謝你，有你在真好!");
            needle.post('http://(a_server_IP)/karos/UpMood.php', {form:{moodData:'2'}});
            return;
        }
        if (mood3.includes(msg)) {
            io.sockets.connected[socket.id].emit("chat message", {
                username:'iKaros',
                msg:"嗚嗚嗚，我好難過。"
            });
            speak("嗚嗚嗚，我好難過。");
            needle.post('http://(a_server_IP)/karos/UpMood.php', {form:{moodData:'3'}});
            return;
        }
        if (mood4.includes(msg)) {
            io.sockets.connected[socket.id].emit("chat message", {
                username:'iKaros',
                msg:"聽到這話我好開心。"
            });
            speak("聽到這話我好開心。");
            needle.post('http://(a_server_IP)/karos/UpMood.php', {form:{moodData:'4'}});
            return;
        }
        
        needle.get(
            encodeURI("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/" + LUISAppID + "?subscription-key=" + LUISkey + "&staging=true&timezoneOffset=480&q=" + msg)
          , function (error, response, data) {
                if (error) {
                    io.sockets.connected[socket.id].emit("chat message", {
                        username:"iKaros",
                        msg:"錯誤發生，請再試一次"
                    });
                    return;
                }
                console.log("bot -> " + socket.username+ " 我認為這句話的意圖是: " + data.topScoringIntent.intent);
                if (data.topScoringIntent.intent=="我叫做") readytoidentify=true;
                else readytoidentify=false;
                switch(data.topScoringIntent.intent) {
                    case "問候":
                        console.log("bot -> " + socket.username + " 你好，" + socket.username);
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"你好，" + socket.username
                        });
                        speak("你好，" + socket.username);
                        break;
                    case "求推薦早餐":
                        var food = ["水餃","水煎包","包子","蘿蔔糕","燒餅","三明治","蛋餅","油條配豆漿"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "求推薦午餐":
                        var food = ["雞排便當","豬肉便當","滷肉飯","鍋貼","義大利麵","牛肉麵"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "求推薦晚餐":
                        var food = ["烤肉","雞排","披薩","雞排便當","豬肉便當","滷肉飯","鍋貼"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "我叫做":
                        for (i in data.entities) {
                            if (data.entities[i].type == "名子") {
                                lastname = data.entities[i].entity;
                                io.sockets.connected[socket.id].emit("chat message", {
                                    username:"iKaros",
                                    msg: "你好，" + data.entities[i].entity
                                });
                                io.sockets.connected[socket.id].emit("setname", {
                                    name: data.entities[i].entity
                                });
                                speak("你好，" + data.entities[i].entity);
                                return;
                            }
                        }
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"抱歉，辨識不出您的名子"
                        });
                        speak("抱歉，辨識不出您的名子");
                        break;
                    default:
                        console.log("bot -> " + socket.username + " 抱歉，我不知道你在說什麼");
                        io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"抱歉，我不知道您在說什麼"
                        });
                        speak("抱歉，我不知道您在說什麼");
                        break;
                }
            }
          )
    });

    socket.on("startRecording", function(){
        if (socket.username=="undefined" || socket.username==undefined) {
            io.sockets.connected[socket.id].emit("server restarted", {
                msg:"Server Restarted."
            });
            return;
        }
        if (!recording[0].includes(socket.username)) {
            var timenow = unixTime(new Date());
            recording[0].push(socket.username);
            var filename = socket.username + "_" + timenow;
            var rec = exec("linco -B 16 -C 1 -R 16000 | oggenc -r -B 16 -C 1 -R 16000 -q 1 - -o sounds/" + filename + ".ogg");
            recording[1].push(rec);
            rec.on("close",(code) => {
                if (!users.includes(socket.username)) {
                    console.log(socket.username + " quitted, stop other actions.");
                    return;
                }
                var transcode=exec("sox\\sox.exe sounds/" + filename + ".ogg sounds/" + filename + ".wav");
                transcode.on("close",(code) => {
                    var soundFilePath = __dirname + "/sounds/" + filename + ".wav";
                    if (!readytoidentify) return;
                    console.log("開始找聲音對應到的ID");
                    readytoidentify=false;
                    needle.get(encodeURI("http://localhost/identifyspeaker.aspx?filepath=" + soundFilePath), function (error, response, body) {
                        var result = JSON.parse(body);
                        if (result.Status == "Success") {
                            if (result.ID == "00000000-0000-0000-0000-000000000000") {
                                io.sockets.connected[socket.id].emit("chat message", {
                                    username:"iKaros",
                                    msg:"無法辨識到任何人聲，請再試一次"
                                });
                            } else {
                                console.log("使用者ID:" + result.ID + "  可信度:" + result.Confidence);
                                if (result.Confidence == "High") {
                                    if (!users.includes(socket.username)) return;
                                    io.sockets.connected[socket.id].emit("chat message", {
                                        username:"iKaros",
                                        msg:"歡迎回來"
                                    });
                                    speak("歡迎回來");
                                    central.emit("service",602);
                                } else {
                                    central.emit("service",603);
                                    needle.get(encodeURI("http://localhost/adduser.aspx?filePath=" + soundFilePath),function(error, response, body) {
                                        var result = JSON.parse(body);
                                        needle.post('http://(a_server_IP)/karos/NewPerson.php', {form:{voice_id:result.ID}});
                                        if (!users.includes(socket.username)) return;
                                        if (result.Status == "Success") {
                                            /*io.sockets.connected[socket.id].emit("chat message", {
                                                username:"iKaros",
                                                msg:"你好，你的新ID是" + result.ID
                                            });
                                            speak("你好，你的新ID是" + result.ID);*/
                                            console.log("sound ID for " + socket.username + " is " + result.ID);
                                        } else {
                                            io.sockets.connected[socket.id].emit("chat message", {
                                                username:"iKaros",
                                                msg:"無法上傳使用者音檔(" + result.response + ")"
                                            });
                                        }
                                    });
                                }
                                central.emit("speaker_recognition",{
                                    ID: result.ID,
                                    Confidence: result.Confidence
                                });
                                central.emit("service",601);
                            }
                        } else {
                            io.sockets.connected[socket.id].emit("chat message", {
                                username:"iKaros",
                                msg:"無法辨識(" + result.response + ")"
                            });
                        }
                    });
                });
            });
        }
    });
    
});

//指定port
http.listen(process.env.PORT || 3000, function(){
    console.log("listening on *:3000");
});