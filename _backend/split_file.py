import os
import argparse

def split_file(input_file, lines_per_file=3000):
    """
    指定されたファイルを一定行数ごとに分割して保存する関数
    
    Args:
        input_file (str): 分割する入力ファイルのパス
        lines_per_file (int): 1ファイルあたりの行数（デフォルト: 3000）
    """
    # 入力ファイルのディレクトリとファイル名を取得
    input_dir = os.path.dirname(input_file)
    base_name = os.path.basename(input_file)
    file_name, file_ext = os.path.splitext(base_name)
    
    # 入力ファイルを読み込む
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # ファイルの総行数
    total_lines = len(lines)
    
    # 分割するファイル数を計算
    num_files = (total_lines + lines_per_file - 1) // lines_per_file
    
    print(f"ファイル '{input_file}' を {num_files} 個のファイルに分割します（1ファイルあたり {lines_per_file} 行）")
    
    # 指定された行数ごとにファイルを作成
    for i in range(num_files):
        start_line = i * lines_per_file
        end_line = min((i + 1) * lines_per_file, total_lines)
        
        # 出力ファイル名を生成（例: filename_part1.txt）
        output_file = os.path.join(input_dir, f"{file_name}_part{i+1}{file_ext}")
        
        # 分割したファイルを書き込む
        with open(output_file, 'w', encoding='utf-8') as f:
            f.writelines(lines[start_line:end_line])
        
        print(f"  {output_file} を作成しました（{end_line - start_line} 行）")

if __name__ == "__main__":
    # 特定のファイルを分割する場合
    input_file = "_backend/text/道路法解説/output.txt"
    lines_per_file = 3000
    split_file(input_file, lines_per_file) 