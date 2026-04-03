---
date created: 2025-01-12 15:17
date modified: 2025-05-20 14:12
tags:
---


職場のPCはproxy.pacファイルを使っており、固定IPアドレスによって、アクセスできるProxyサーバーを振り分けています。Node.jsを使いたいときに、単純にインストールするだけでは利用できなかったので、今回、使えるようになるまでの手順をまとめておきます。

## VSCodeのインストール

1. 公式ウェブサイト([Visual Studio Code](https://code.visualstudio.com/))からVSCodeのインストーラーをダウンロードして実行します。

## Gitのインストール

1. [Git 公式ウェブサイト](https://gitforwindows.org/)からGitのインストーラーをダウンロードし、インストールします。

## VSCodeでGitのPathを設定する

VSCodeを起動して「ターミナル」を開きます。 `git clone`すると下記のエラーが出ました。

```
git : 用語 'git' は、コマンドレット、関数、スクリプト ファイル、
または操作可能なプログラムの名前として認識されません。名前が正しく記述されていることを確認し、
パスが含まれている場合はそのパスが正しいことを確認してから、再試行してください。
```

VSCodeがgitの場所を認識していないということらしいので、Gitのpathを通します。 VSCodeの左下の歯車から設定を選択。上の設定の検索に「git path」を入力して、「setting.jsonを編集」をクリックして、gitをインストールしたパスを記載します。

```json
"git.path": "C:\\Program Files\\Git\\cmd\\git.exe"
```

「setting.json」を保存してVSCodeを再起動すると、ちゃんとgit コマンドが通りました。

## Node.jsのインストール

1. [Node.js公式ホームページ](https://nodejs.org/)からダウンロードしてインストールします。

VSCodeのターミナルでnpmコマンドを試してみると次のエラーが出ました。

```
npm -v

npm : 用語 'npm' は、コマンドレット、関数、スクリプト ファイル、または操作可能なプログラムの名前として認識されません。名前が正しく記述されていることを確認し、パスが含まれている場合はそのパスが正しいこと
を確認してから、再試行してください。
```

VSCodeを起動したままNodejsをインストールしたのが原因のようです。([参考](https://nabelog.org/win10-vscode-nodejs-issue/))

再起動して、再度npmコマンドを試すと、次はOKでした。

```
npm -v
9.6.7
```

## yarnのインストール

npmを利用してyarnをインストールしようとしたら、次のエラーが出ました。

```
npm install -g yarn 

npm ERR! code EPROTO
npm ERR! syscall write
npm ERR! errno EPROTO
npm ERR! request to https://registry.npmjs.org/yarn failed, reason: write EPROTO B0450000:error:0A000152:SSL routines:final_renegotiate:unsafe legacy renegotiation disabled:c:\ws\deps\openssl\openssl\ssl\statem\extensions.c:922:
npm ERR!
```

npmにプロキシを設定します。ユーザー名とパスワードが必要です。

```
npm -g config set proxy http://<userid>:<password>@<server-address>:<port>
npm -g config set https-proxy http://<userid>:<password>@<server-address>:<port>
```

ユーザー名は下記コマンドで確認できます。

```
set user
```

これで、無事yarnもインストールできたので実行してみると、またまたエラーが出ました。

```
yarn : このシステムではスクリプトの実行が無効になっているため、
ファイル C:\Users\ユーザー名\AppData\Roaming\npm\yarn.ps1 を読み込むことができません。
```

このエラーは、PowerShellのスクリプト実行ポリシーが制限されているために発生しているようです。 PowerShellを管理者権限で開いて、現在の実行ポリシーを確認します。

```
Get-ExecutionPolicy
Restricted
```

「Restricted」と表示されているので、実行ポリシーを変更します。

```
Set-ExecutionPolicy RemoteSigned
```

これで、yarnが実行できるようになりました。

## 参考サイト

- [【node.js】大企業様で使われているproxy.pacよりProxyサーバを設定している環境で「npm install」を使う方法](https://zenn.dev/hukurouo/articles/proxy-pac-npm-install)
- [Node.js / npm 設定 に プロキシ を 設定 または 解除 する 方法](https://garafu.blogspot.com/2016/10/nodejs-npm-proxy-settings.html)
- [PowerShellからyarnすると「このシステムではスクリプトの実行が無効になっているため、ファイル～を読み込むことができません。」というエラーが表示される](https://labor.ewigleere.net/2021/01/01/yarn-powershell-execution-policy/)





