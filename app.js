//Original: https://github.com/aszx87410/nodejs_simple_chatroom  licensed under ISC
const { spawn, exec } = require("child_process");
var app = require("express")(),
    http = require("http").Server(app),
    io = require("socket.io")(http),
    needle = require("needle"),
    unixTime = require("unix-time"),
    fs = require('fs'),
    central = require('socket.io-client')('http://172.22.100.200:81');

app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});

app.get("/jquery-3.3.1.min.js", function(req, res){
    res.sendFile(__dirname + "/jquery-3.3.1.min.js");
});

var users = [];
var recording = [[],[]]; //[[username],[pid]]
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
var return501=true, return501_2=false, speaking;
function speak(data) {
    if (speaking) {
        setTimeout(function() {
            speak(data);
        }, 500);
        return;
    }
    let speaker = exec("speak.exe " + TTSkey + " " + data);
    speaking=true;
    central.emit("service",504);
    io.emit("chat message", {
        username:'iKaros',
        msg:data
    });
    speaker.on("close",function() {
        speaking=false;
        if (!return501_2) {
            console.log("return501 " + data);
            central.emit("service",501);
        } else {
            return501_2=false;
        }
    });
}

central.on("k_speak",function(data) {
    console.log("k_speak -> " + data);
    speak(data);
});
central.on("service",function(data) {
    console.log("central:  " + data);
    if (!io.sockets.connected[latestID]) return;
    if (data==401) {
        latestUser = "guest"+Math.floor(Math.random()*10000);
        io.sockets.connected[latestID].username=latestUser;
        users.push(latestUser);
        console.log("new user:"+latestUser);
        io.sockets.connected[latestID].emit("setnick",latestUser);
        readytoidentify=true;
    } else if (data==402) {   
       count++;
       console.log("這是我辨識到的第"+count+"個人");
       io.sockets.connected[latestID].emit("402");
       /*speak("您好，請問您有什麼事嗎?");
       socket.emit("chat message", {
            username:"iKaros",
            msg:"您好，請問您有什麼事嗎?"
        });*/
    } else if (data==403) {
       io.sockets.connected[latestID].emit("403");
       readytoidentify=false;
        askname=false;
        askname2=false;
       console.log(latestUser + " left.");
        if (recording[0].includes(latestUser)) {
            var index = recording[0].indexOf(latestUser);
            exec("wmic process where (ParentProcessId=" + recording[1][index].pid + ") get Caption,ProcessId", (error, stdout, stderr) => {
                exec("taskkill /T /f /pid " + stdout.split("\n")[1].replace("linco.exe","").replace(" ",""));
            });
            recording[1].splice(index,1);
            recording[0].splice(index,1);
        }
        if (users.includes(latestUser))
            users.splice(users.indexOf(latestUser),1);
    } else if (data==703) {
        return501=false;
        let killspeak = exec("taskkill /f /im speak.exe");
        killspeak.on("close",function() {
            console.log("killspeak ended.");
            return501=true;
            return501_2=true;
        });
    }
});

central.on("name_add",function(data) {
    console.log("name_add -> "+data);
    if (data==304) {
        askname=true;
    } else if (data==305) {
        askname2=true;
    }
});    
//當新的使用者連接進來的時候
var count=0, askname=false, askname2=false, latestID,latestUser;
io.on("connection", function(socket){
    central.emit("service",404);
    latestID=socket.id;
    latestUser=socket.username;
    askname=false;
    askname2=false;

    //監聽新訊息事件
    socket.on("chat message", function(msg){
        central.emit("service",503);
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
        
        if (askname) {
            askname=false;
            central.emit("name_add", msg);
            return;
        } else if (askname2) {
            askname2=false;
            if (msg=="是" || msg=="對" || msg=="是的" || msg=="對的" || msg=="是阿" || msg=="對阿") {
                central.emit("name_add",306);
            } else {
                central.emit("name_add",307);
            }
            return;
        }
        
        if (mood1.includes(msg)) {
            central.emit("k_speak",901);
            return;
        }
        
        needle.get(
            encodeURI("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/" + LUISAppID + "?subscription-key=" + LUISkey + "&staging=true&timezoneOffset=480&q=" + msg)
          , function (error, response, data) {
                if (error) {
                    io.sockets.connected[socket.id].emit("chat message", {
                        username:"iKaros",
                        msg:"錯誤發生，請再試一次(a)"
                    });
                    return;
                }
                console.log("bot -> " + socket.username+ " 我認為這句話的意圖是: " + data.topScoringIntent.intent);
                /*if (data.topScoringIntent.intent=="我叫做") readytoidentify=true;
                else readytoidentify=false;*/
                switch(data.topScoringIntent.intent) {
                    case "貶意詞":
                        central.emit("k_speak",902);
                        break;
                    case "是什麼":
                        console.log("問題類別:是什麼?");
                        if (data.entities.length==0) {
                            console.log("關鍵字:(空白，沒偵測到)");
                            central.emit("k_speak","是什麼");
                        } else {
                            let question="806,";
                            for (i=0; i<data.entities.length; i++) {
                                if (data.entities[i].type=="是什麼")
                                    question+=data.entities[i].entity+","
                            }
                            console.log("關鍵字:"+question);
                            question+="是什麼";
                            central.emit("k_speak",question);
                        }
                        break;
                    case "問候":
                        console.log("bot -> " + socket.username + " 你好，" + socket.username);
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"你好，" + socket.username
                        });*/
                        speak("你好，" + socket.username);
                        break;
                    case "求推薦早餐":
                        var food = ["水餃","水煎包","包子","蘿蔔糕","燒餅","三明治","蛋餅","油條配豆漿"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });*/
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "求推薦午餐":
                        var food = ["雞排便當","豬肉便當","滷肉飯","鍋貼","義大利麵","牛肉麵"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });*/
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "求推薦晚餐":
                        var food = ["烤肉","雞排","披薩","雞排便當","豬肉便當","滷肉飯","鍋貼"];
                        var tmp = food[Math.floor(Math.random()*food.length)]
                        console.log("bot -> " + socket.username+ " 我認為" + tmp + "是不錯的選擇");
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"我認為" + tmp + "是不錯的選擇"
                        });*/
                        speak("我認為" + tmp + "是不錯的選擇");
                        break;
                    case "我叫做":
                        readytoidentify=true;
                        for (i in data.entities) {
                            if (data.entities[i].type == "名子") {
                                lastname = data.entities[i].entity;
                                /*io.sockets.connected[socket.id].emit("chat message", {
                                    username:"iKaros",
                                    msg: "你好，" + data.entities[i].entity
                                });*/
                                io.sockets.connected[socket.id].emit("setname", {
                                    name: data.entities[i].entity
                                });
                                speak("你好，" + data.entities[i].entity);
                                return;
                            }
                        }
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"抱歉，辨識不出您的名子"
                        });*/
                        speak("抱歉，辨識不出您的名子");
                        break;
                    case "停止":
                        exec("taskkill /f /im speak.exe");
                        central.emit("k_speak",703);
                        break;
                    default:
                        console.log("bot -> " + socket.username + " 抱歉，我不知道你在說什麼");
                        /*io.sockets.connected[socket.id].emit("chat message", {
                            username:"iKaros",
                            msg:"抱歉，我不知道您在說什麼"
                        });*/
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
            console.log("didn't record anything.");
            return;
        }
        if (!recording[0].includes(socket.username)) {
            console.log("started a recorder.");
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
                console.log("started transcoding.");
                var transcode=exec("sox\\sox.exe sounds/" + filename + ".ogg sounds/" + filename + ".wav");
                transcode.on("close",(code) => {
                    var soundFilePath = __dirname + "/sounds/" + filename + ".wav";
                    console.log("transcode ended, path="+soundFilePath);
                    if (!users.includes(socket.username)) {
                        console.log(socket.username + " quitted, stop other actions.");
                        return;
                    }
                    if (!readytoidentify) return;
                    console.log("開始找聲音對應到的ID");
                    readytoidentify=false;
                    console.log("bbbbbbb");
                    needle.get(encodeURI("http://localhost/identifyspeaker.aspx?filepath=" + soundFilePath), function (error, response, body) {
                        if (error) {
                            io.sockets.connected[socket.id].emit("chat message", {
                                username:"iKaros",
                                msg:"錯誤發生，請再試一次(b)"
                            });
                            return;
                        }
                        console.log("aaaaaaa");
                        var result = JSON.parse(body);
                        console.log(result);
                        if (!users.includes(socket.username)) {
                            console.log(socket.username + " quitted, stop other actions.");
                            return;
                        }
                        if (result.Status == "Success") {
                            if (result.ID == "00000000-0000-0000-0000-000000000000") {
                                console.log("辨識結果:"+result.ID+"(無法偵測到人聲  註冊新ID)，信心值:"+result.Confidence);
                                /*io.sockets.connected[socket.id].emit("chat message", {
                                    username:"iKaros",
                                    msg:"無法辨識到任何人聲，請再試一次"
                                });*/
                                needle.get(encodeURI("http://localhost/adduser.aspx?filePath=" + soundFilePath),function(error, response, body) {
                                    if (error) {
                                        io.sockets.connected[socket.id].emit("chat message", {
                                            username:"iKaros",
                                            msg:"錯誤發生，請再試一次(b)"
                                        });
                                        return;
                                    }
                                    var result = JSON.parse(body);
                                    if (!users.includes(socket.username)) return;
                                    if (result.Status == "Success") {
                                        needle.post('http://(a_server_IP)/karos/NewPerson.php', {form:{voice_id:result.ID}});
                                        //central.emit("speaker_recognition", result.ID);
                                        central.emit("p_create", result.ID);
                                        console.log("sound ID for " + socket.username + " is " + result.ID);
                                        /*io.sockets.connected[socket.id].emit("chat message", {
                                            username:"iKaros",
                                            msg:"已成功註冊新的ID"+result.ID
                                        });*/
                                        speak("已成功註冊新的ID");
                                    } else {
                                        io.sockets.connected[socket.id].emit("chat message", {
                                            username:"iKaros",
                                            msg:"無法上傳使用者音檔(" + result.response + ")"
                                        });
                                    }
                                });
                            } else {
                                console.log("使用者ID:" + result.ID + "  可信度:" + result.Confidence);
                                if (result.Confidence == "High") {
                                    if (!users.includes(socket.username)) return;
                                    /*io.sockets.connected[socket.id].emit("chat message", {
                                        username:"iKaros",
                                        msg:"歡迎回來"
                                    });
                                    speak("歡迎回來");*/
                                    central.emit("service",602);
									central.emit("speaker_recognition",result.ID);
                                } else {
                                    central.emit("service",603);
                                    needle.get(encodeURI("http://localhost/adduser.aspx?filePath=" + soundFilePath),function(error, response, body) {
                                        if (error) {
                                            io.sockets.connected[socket.id].emit("chat message", {
                                                username:"iKaros",
                                                msg:"錯誤發生，請再試一次(c)"
                                            });
                                            return;
                                        }
                                        var result = JSON.parse(body);
                                        if (!users.includes(socket.username)) return;
                                        if (result.Status == "Success") {
											needle.post('http://(a_server_IP)/karos/NewPerson.php', {form:{voice_id:result.ID}});
											//central.emit("speaker_recognition", result.ID);
                                            central.emit("p_create", result.ID);
                                            console.log("sound ID for " + socket.username + " is " + result.ID);
                                            /*io.sockets.connected[socket.id].emit("chat message", {
                                                username:"iKaros",
                                                msg:"已成功註冊新的ID"+result.ID
                                            });*/
                                            speak("已成功註冊新的ID");
                                        } else {
                                            io.sockets.connected[socket.id].emit("chat message", {
                                                username:"iKaros",
                                                msg:"無法上傳使用者音檔(" + result.response + ")"
                                            });
                                        }
                                    });
                                }
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
        } else {
            console.log("I'm not recording.");
        }
    });
});


//指定port
http.listen(process.env.PORT || 3000, function(){
    console.log("listening on *:3000");
});