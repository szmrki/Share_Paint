#coding: utf-8
require "sinatra"
require "sinatra/reloader"
require "active_record"
require 'base64'
require 'sinatra-websocket'
require 'json'
require 'yaml'

enable :sessions  #セッションを有効にする

#websocketを使用するとデータベースのリクエストの上限数を超えてしまう
#ことがあったため、YAMLで設定を記述、上限数を上げた
db_config = YAML.load_file('config/database.yml')
ActiveRecord::Base.establish_connection(
    db_config[settings.environment.to_s]
)

set :sockets, []   #websocket用

class User_auth <ActiveRecord::Base
end

class Paint < ActiveRecord::Base
end

get '/' do
    @msg = session[:error]
    session[:error] = nil
    erb :index
end

#描画画面　ログイン、リロード、履歴から戻った際に使用される
post '/drawing' do
    if !User_auth.where(:user => params[:user], 
                        :password => params[:password]).empty?
        session[:error] = nil 
        @user = params[:user]
        session[:user] = @user #session[:~]でセッションが有効となる
        session[:sid] = session.id #sessionIDを保存
        erb :drawing
    else
        session[:error] = "ログインできませんでした"
        redirect '/'
    end        
end

#描画画面　websocket通信の際に使用される
get '/drawing' do
    @user = session[:user]
    date = Modify_time()
    if !request.websocket?
        halt 404
    else
        # WebSocketリクエストを処理
        request.websocket do |ws|
            # クライアントが接続したとき
            ws.onopen do
            settings.sockets << ws
            end

            # クライアントから描画データが送信されたとき
            ws.onmessage do |data|
                data = JSON.parse(data)
                #容量削減のためDBにはpathを保存する
                if data['id'] == -1  #初回の通信
                    if !Paint.all.empty?
                        tmp_id = Paint.last.id + 1
                        id = format("%03d", tmp_id) 
                    else
                        tmp_id = 1
                        id = format("%03d", tmp_id)
                    end
                    image_path = "images/paint_#{id}.jpg"

                    #DBに保存する      
                    Paint.create(:user => @user, 
                                 :date => date,
                                 :image_path => image_path)

                else  #2回目以降はidが送られてくる
                    id = data['id']
                    tmp_id = id
                    id = format("%03d", tmp_id)
                    image_path = "images/paint_#{id}.jpg"
                    
                    if !Paint.where(:id => id).empty? 
                        updated_data = Paint.find(id)
                        updated_data.update(:date => date) #更新日時をアップデート
                    else     #編集中のファイルを消されていたとき
                        Paint.create(:user => @user, 
                                     :date => date,
                                     :image_path => image_path)
                    end
                end

                #画像を保存する
                File.open("./public/#{image_path}", "wb") do |f|
                    f.write(Base64.decode64(data['image']))
                end
                    
                #画像ファイルのパスを他の全クライアントに送信（ブロードキャスト）
                settings.sockets.each do |s|
                    s.send({"image_path" => image_path,
                            "msg" => "NaN",
                            "id" => tmp_id}.to_json)
                end
            end

            # クライアントが切断したとき
            ws.onclose do
                settings.sockets.delete(ws)
            end
        end  
    end
end

#履歴のページにアクセスする際に使用される
get '/history' do
    if !User_auth.where(:user => session[:user]).empty? && 
                                        session[:sid] == session.id
        @user = session[:user] 
        @list = Paint.all
        erb :history
    else
        halt 404
    end
end

#ログアウトのボタンを押したときに使用される
post '/logout' do
    session.clear  #セッションを切断
    session[:error] = "ログアウトしました"
    redirect '/'
end

#画像削除ボタンを押した際に使用される
post '/delete' do
    Paint.find_by(:image_path=>params[:picture]).destroy
    File.delete("./public/#{params[:picture]}")
    redirect '/history'
end

#保存ボタンを押したときに使用される
get '/post' do
    if !request.websocket?
        halt 404
    else
        request.websocket do |ws|
            ws.onopen do
                settings.sockets << ws
            end

            ws.onmessage do |msg|
                msg = JSON.parse(msg)
                if msg["msg"] == "reload"
                    # 全クライアントにリロード命令を送信
                    settings.sockets.each do |s|
                        s.send({"image_path" => "NaN",
                                "msg" => "reload",
                                "id" => msg["id"]}.to_json)
                    end                    
                end
            end

            ws.onclose do
                settings.sockets.delete(ws)
            end
        end
    end
end

#ログイン通知の処理を行うため
get '/participate' do
    if !request.websocket?
        halt 404
    else
        request.websocket do |ws|
            ws.onopen do
                settings.sockets << ws
            end

            ws.onmessage do |msg|
                msg = JSON.parse(msg)
                if msg["msg"] == "login"           
                    settings.sockets.each do |s|                  
                        if s != ws  #送り主以外の全クライアントにログイン通知
                            s.send({"image_path" => "NaN",
                                    "msg" => "login"}.to_json)
                        end
                    end
                end
            end

            ws.onclose do
                settings.sockets.delete(ws)
            end
        end
    end
end

#時間表現を整形するメソッド
def Modify_time
    time = Time.now
    month = format("%02d", time.month)
    day = format("%02d", time.day)
    hour = format("%02d", time.hour)
    min = format("%02d", time.min)
    sec = format("%02d", time.sec)
    date = "#{time.year}-#{month}-#{day} #{hour}:#{min}:#{sec} #{time.zone}"
    return date
end