import fitz  # PyMuPDF

def extract_text_with_pymupdf(pdf_path, output_text_file):
    """
    PyMuPDFのみを使用してPDFからテキストを抽出し、テキストファイルに保存する関数
    
    Args:
        pdf_path (str): 入力PDFファイルのパス
        output_text_file (str): 出力テキストファイルのパス
    """
    try:
        # PDFドキュメントを開く
        pdf_document = fitz.open(pdf_path)
        print(f"PDFファイル '{pdf_path}' を処理中... 全{len(pdf_document)}ページ")
        
        all_text = []
        
        # 各ページを処理
        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            print(f"ページ {page_num+1}/{len(pdf_document)} からテキストを抽出中...")
            
            # テキストを抽出（異なる抽出方法を試すことができます）
            # 方法1: 標準テキスト抽出
            text = page.get_text()
            
            # 方法2: テキストをブロック単位で抽出（レイアウトを保持）
            # text = page.get_text("blocks")
            
            # 方法3: HTMLとして抽出
            # text = page.get_text("html")
            
            # 方法4: JSONとして抽出
            # text = page.get_text("json")
            
            all_text.append(text)
        
        # PDFドキュメントを閉じる
        pdf_document.close()
        
        # 抽出したテキストをファイルに書き込む
        with open(output_text_file, 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(all_text))
        
        print(f"処理が完了しました。テキストは '{output_text_file}' に保存されました。")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    pdf_path = "_backend\pdf\行政書士テキスト\第６章_地方自治法.pdf"  # テキストを抽出したいPDFファイルのパス
    output_text_file = "output.txt"  # 出力テキストファイルのパス
    
    extract_text_with_pymupdf(pdf_path, output_text_file)