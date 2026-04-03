---
date created: 2025-04-08 12:42
date modified: 2025-04-08 17:06
tags:
---



```cardlink
url: https://www.python.org/downloads/windows/
title: "Python Releases for Windows"
description: "The official home of the Python Programming Language"
host: www.python.org
favicon: https://www.python.org/static/favicon.ico
image: https://www.python.org/static/opengraph-icon-200x200.png
```
[Python Releases for Windows \| Python.org](https://www.python.org/downloads/windows/)


[python公式サイト](https://www.python.org/downloads/windows/)からWindowsインストーラーをダウンロードして実行する。

インストールする際に、「Add python.exr to PATH」にチェックを入れておくこと。

「スタートメニュー」＞「設定」＞「ネットワークとインターネット」＞「プロキシ」をクリック。

プロキシ設定の画面内に「スクリプトのアドレス」があるので、そのアドレスをコピーしてブラウザに張り付けると、proxypacのファイルがダウンロードされる。

![[proxy_01.png|600]]

メモ帳でファイルを開き、最下段に記載されているIPアドレスとポート番号を確認

```
return "PROXY 202.221.175.116:3128 ; PROXY 210.130.236.140:3128";
```

この場合、IPアドレスは「202.221.175.116」、ポート番号が「3128」

IPアドレスはおそらく２種類記載されているが、どちらか一方でよい。

## pipの設定

pythonのパッケージ管理ツール「pip」は、python3をインストールすれば自動的にインストールされるが、HYOGOドメインに参加しているPC（つまり職場PC）で利用するためには、SSLの設定とプロキシ設定が必要。

### フォルダオプションの設定変更

エクスプローラーを起動し、「表示」＞「オプション」をクリックするとフォルダーオプションが起動するので、「表示」タブを開いて、下記の設定をしてから「OK」で保存。

1. 『隠しファイル、隠しフォルダー、および隠しドライブを表示する』を選択。
2. 『登録されている拡張子は表示しない』のチェックを外す。

### pip.iniファイルの作成

下記の場所にpip.iniファイルを作成する。m000000は職員番号。AppDataは隠しフォルダなので薄く表示される。

おそらくRomingフォルダまでは存在するので、その下にpipフォルダを作成する。

```
“C:\Users\m000000\AppData\Roaming\pip\pip.ini”
```

pip.iniファイルは、pipフォルダ内で「右クリック」＞「新規作成」＞「テキストドキュメント」を開き、ファイル名をpip.iniに変更して保存。

※基本的なことだが、フォルダオプションで拡張子を表示する設定にしていないと、pip.iniは作成できない。（pip.ini.txtになってしまう）

pip.iniに下記を張り付ける。

```shell
[global]
trusted-host = pypi.python.org
               pypi.org
               files.pythonhosted.org
proxy = http://<ユーザー名>:<パスワード>@<IPアドレス>:<ポート番号>
```

trusted-hostは信頼済みサイトを登録する。このままコピペでよい。

proxyは各PCやユーザ情報を登録する。

例えば

- 職員番号「m000000」
- パスワード「password」
- IPアドレス「202.221.175.116」
- ポート番号が「3128」

の場合は、下記のとおりとなる。

```shell
proxy = http://m000000:password@202.221.175.116:3128
```

なお、ここでいうパスワードは、HYOGOドメイン（職場PC）にログインする際のパスワードを指す。