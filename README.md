## 概要
- 異なるブラウザ間でお絵描きを同時に共有するアプリ
- RubyのSinatraやWebSocket通信の勉強用

## 使用技術
- バックエンド: Ruby, Sinatra, Sinatra-WebSocket, ActiveRecord  
- フロントエンド: JavaScript (jQuery, WebSocket), HTML, CSS
- テンプレートエンジン: ERB
- DB: SQLite
- Webサーバ: localhostでのみ実行

## 機能
- ログイン画面
- ユーザ名とパスワードによる簡単な認証
- Canvasによる描画機能
- 線の色・太さの選択
- 消しゴム機能
- 描画データの削除機能
- マウス操作による描画制御(マウスを押すと開始, 離すと保存)
- WebSocketによるリアルタイム通信

## ディレクトリ構成
~~~sh
.
├── Gemfile
├── README.md
├── app.rb
├── config
│   └── database.yml
├── hatten.db
├── public
│   ├── css
│   │   ├── index.css
│   │   └── style.css
│   ├── images
│   └── js
│       └── drawing.js
└── views
    ├── drawing.erb
    ├── history.erb
    └── index.erb
~~~

## インストール & セットアップ
### 環境
- Ruby 2.7.6

### リポジトリのクローン
~~~sh
git clone https://github.com/szmrki/Share_Paint.git
cd Share_Paint
~~~

### 仮想環境の作成とパッケージのインストール
~~~sh
rbenv install 2.7.6 --verbose
rbenv global 2.7.6
rbenv rehash
ruby -v  #バージョン確認
bundle install --path=vendor/bundle #Gemfileに追加されたパッケージのインストール
~~~

### ローカル環境での実行
~~~sh
mkdir public/images  #最初の実行時にimagesディレクトリを作成しておく
bundle exec ruby app.rb
~~~
- localhost:4567でサーバが立ち上がる

## 課題
- 他ユーザがログインするとalert表示されるが，OKを押す前にログインしたユーザが操作すると番号がずれる
- ログアウトして再度ログインする際は一旦ブラウザを閉じてからが望ましい