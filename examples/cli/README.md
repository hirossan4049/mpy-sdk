# M5Stack CLI Examples

このディレクトリには、M5Stack MicroPython CLI の使用例が含まれています。

## 基本的な使用方法

### basic-usage.sh

M5Stack CLI の基本的な機能を順番に実行するシンプルなデモスクリプトです。

**実行方法:**
```bash
./basic-usage.sh
```

**このスクリプトの動作:**
1. 利用可能なシリアルポートを一覧表示
2. デバイス情報を取得
3. 簡単な Python コードを実行
4. デバイス上のファイルを一覧表示
5. LED テスト用の main.py ファイルを作成
6. main.py ファイルを `/flash/main.py` にアップロード
7. アップロードした main.py ファイルを実行
8. ファイルをダウンロード

### 事前準備

このスクリプトは pnpm を使用してローカルの CLI を実行します。以下を確認してください：

```bash
# pnpm がインストールされていることを確認
pnpm --version

# 依存関係がインストールされていることを確認
pnpm install
```

### 手動での pnpm cli 使用例

プロジェクトルートから以下のコマンドを実行してください：

```bash
# デバイスの一覧表示
pnpm cli list-ports

# デバイス情報の取得
pnpm cli info /dev/tty.usbserial-XXXX

# Python コードの実行
pnpm cli exec /dev/tty.usbserial-XXXX "print('Hello World!')"

# ファイルのアップロード（main.py として）
pnpm cli upload /dev/tty.usbserial-XXXX main.py /flash/main.py

# ファイルのダウンロード
pnpm cli download /dev/tty.usbserial-XXXX /flash/main.py

# ファイル一覧の表示
pnpm cli ls /dev/tty.usbserial-XXXX

# REPL セッションの開始
pnpm cli repl /dev/tty.usbserial-XXXX
```

### 注意事項

- M5Stack デバイスが USB で接続されている必要があります
- デバイスのポートパスは環境によって異なります（例: `/dev/tty.usbserial-XXXX`, `COM3` など）
- ファイルは `/flash/main.py` として保存されます（M5Stack の標準的な起動ファイル）
- 一部の機能は M5Stack のモデルによって異なる場合があります