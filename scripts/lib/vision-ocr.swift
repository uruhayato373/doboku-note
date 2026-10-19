// vision-ocr.swift — macOS の Vision で画像の日本語を読み、行を紙面の上から下・左から右の順に出す。
// 使い方: swift scripts/lib/vision-ocr.swift <画像> [<画像> …]
// 出力: 画像ごとに `=== <画像のパス>` の行に続けて、読み取った行（同じ高さの行は左から右へ空白 2 つでつなぐ）。
// 全文ライブラリの文字化けページ（DN-0767）を起こし直すときの「機械の読み」に使う（scripts/standards-library-mojibake.mjs）。
import Foundation
import Vision
import AppKit

struct Line { let text: String; let x: CGFloat; let y: CGFloat; let h: CGFloat }

func recognize(_ path: String) -> [String] {
  guard let image = NSImage(contentsOfFile: path),
        let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("読めない画像: \(path)\n".data(using: .utf8)!)
    exit(2)
  }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["ja-JP", "en-US"]
  request.usesLanguageCorrection = true
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  do { try handler.perform([request]) } catch {
    FileHandle.standardError.write("OCR に失敗: \(path) \(error)\n".data(using: .utf8)!)
    exit(2)
  }
  var lines: [Line] = []
  for observation in request.results ?? [] {
    guard let top = observation.topCandidates(1).first else { continue }
    let box = observation.boundingBox // 原点は左下・0〜1
    lines.append(Line(text: top.string, x: box.minX, y: 1 - box.maxY, h: box.height))
  }
  // 上から下へ。行の高さの半分以内の差は同じ行とみなし、左から右へ並べる
  lines.sort { $0.y < $1.y }
  var rows: [[Line]] = []
  for line in lines {
    if var last = rows.last, let first = last.first, abs(line.y - first.y) < max(first.h, line.h) * 0.5 {
      last.append(line)
      rows[rows.count - 1] = last
    } else {
      rows.append([line])
    }
  }
  return rows.map { $0.sorted { $0.x < $1.x }.map { $0.text }.joined(separator: "  ") }
}

for path in CommandLine.arguments.dropFirst() {
  print("=== \(path)")
  for line in recognize(path) { print(line) }
}
