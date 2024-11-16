const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');
let click = 0; //constだと値を再代入できないのでletを使用
const color = document.getElementById("color");
const thickness = document.getElementById("thickness");
const eraser = document.getElementById("eraser");
const pen = document.getElementById("pen");
let id = -1;
const headline = document.getElementById("headline");
const sessionKey = "first access";
const sessionValue = true;

White_BG(); //背景色を白に設定

//初回のみlogin_websocket関数を実行、ログアウトして再度ログインする際は一旦ブラウザを閉じてからが望ましい
//sessionstorageにデータがあるかどうかで初回かそうでないか区別
if (!sessionStorage.getItem(sessionKey)) {
    login_websocket();
    sessionStorage.setItem(sessionKey, sessionValue);
}

id = load_websocket();

//Canvasでマウスを操作した時の処理
$("#canvas").mousedown(function() {
    click = 1;
}).mouseup(function() {
    click = 0;
    send_websocket();
}).mousemove(function(e) {
    if(!click) return false;
    draw(e.offsetX, e.offsetY);
});

//描画を行う関数
function draw(x, y) {
    ctx.lineWidth = thickness.value; //ペンの太さを取得
    if (pen.checked) {  //ラジオボタンでペンが選択されていたら
        ctx.strokeStyle = color.value;
    }
    else ctx.strokeStyle = "#FFFFFF"; //消しゴムは白の重ね塗りで表現
    if (click == 1) {
        click = 2;
        ctx.beginPath();  //準備
        ctx.lineCap = "round"; //線を角丸にする
        ctx.moveTo(x, y);
    }
    else {
        ctx.lineTo(x, y);
    }
    ctx.stroke();
};

//描画の全削除
$("#clear").click(function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    White_BG();
    send_websocket();
});

//画像を保存し、新しいキャンバスに移る
$("#post").click(function() {
    const ws_post = new WebSocket(`ws://${location.host}/post`);
    ws_post.onopen = function() {
        let post_data = {"msg": "reload", "id": id};
        ws_post.send(JSON.stringify(post_data));
        setTimeout(function() {
            ws_post.close();
        }, 100);
    }; //reloadという文字列を/postに送る
    //メッセージを受信した際の処理はload_websocket関数にまとめる(/drawingで処理される)
});

//画像を保存した際の背景色を白にする関数
function White_BG() {
    ctx.fillStyle = "#FFF"
    ctx.fillRect(0,0, canvas.width, canvas.height);
};

//websocketを通し、最新の画像データを取得する関数
function load_websocket() {
    const img = document.createElement('img');
    const ws = new WebSocket(`ws://${location.host}/drawing`);
    ws.onopen = function() {
        console.log("open1");
    };
    ws.onmessage = function(event) {
        const image_path = JSON.parse(event.data).image_path; // サーバから画像をロード
        if (image_path == "NaN") {
            let return_msg = JSON.parse(event.data).msg;
            if (return_msg == "reload") { //あるユーザが保存ボタンを押すと他のユーザもリロードされる
                location.reload();
            }
            //他ユーザがログインした時の処理、画像データとidを送ってあげる
            else if (return_msg == "login") {  
                alert("他のユーザがログインしました"); 
                //alertのOKを押す前にログインしたユーザが操作すると番号がずれる
                let base64 = canvas.toDataURL("image/jpeg");
                let sync_data = {"image": base64.replace(/^.*,/, ''), "id": id};
                setTimeout(function() {
                    ws.send(JSON.stringify(sync_data));
                }, 100);
            }
            else {
                id = JSON.parse(event.data).id; //idを取得
                setTimeout(function() {
                    ws.close();
                }, 100);
            }
        }
        else {
            id = JSON.parse(event.data).id; //idを取得
            headline.innerHTML = `Canvas<br>Number:${id}`;
            img.src = image_path + "?t=" + new Date().getTime(); 
            //同じパスだとキャッシュからデータがとられるため、画像が更新されない
            //そこで、現在時刻をクエリに含めることでキャッシュからとられず、常にサーバから画像を取得するようにした
            //img.src = image_path
            img.onload =  function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                White_BG();
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            console.log(event.data);
            setTimeout( ()=> {
                    ws.close();
            }, 100);
        }
    };
    ws.onerror = function() {
        console.log("error1");
    };
    ws.onclose = function() {
        console.log("close1");
        setTimeout(load_websocket(), 1000); //再帰呼び出しにすることで、１回の通信で終わらせないようにする
    };
    return id //別ブラウザで描いたものとidを合わせるため
};

//websocketを通し、画像データを送信する関数
function send_websocket() {
    let base64 = canvas.toDataURL("image/jpeg");
    let data = {"image": base64.replace(/^.*,/, ''), "id": id};
    const ws = new WebSocket(`ws://${location.host}/drawing`);
    ws.onopen = function() {
        ws.send(JSON.stringify(data));
    };
    ws.onmessage = function(data) {
        id = JSON.parse(data.data).id;
        headline.innerHTML = `Canvas<br>Number:${id}`;
        setTimeout( ()=> {
            ws.close();
        }, 100);
    };
    ws.onerror = function() {
        console.log("error2");
    };
};

//ログインしたことを他のユーザに知らせる。この通信をきっかけとして、キャンバスを同期させる
function login_websocket() {
    const ws_login = new WebSocket(`ws://${location.host}/participate`);
    ws_login.onopen = function() {
        let login_data = {"msg": "login"};
        ws_login.send(JSON.stringify(login_data));
    };
    ws_login.onmessage = function() {
        setTimeout(function() {
            ws_login.close();
        }, 100);
    };
    ws_login.onerror = function() {
        console.log("error3");
    };
};