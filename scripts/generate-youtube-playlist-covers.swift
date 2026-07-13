#!/usr/bin/env swift

import AppKit
import Foundation

let repoRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let defaultBase = "assets/youtube-cover-templates/playlist-universal-approved-base.jpg"
let defaultOutput = "outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709-coretext"

var basePath = defaultBase
var outputPath = defaultOutput
var includeUncreated = true
var selectedSupports = Set<String>()

var args = CommandLine.arguments.dropFirst()
while let arg = args.first {
    args = args.dropFirst()
    switch arg {
    case "--base":
        if let value = args.first {
            basePath = String(value)
            args = args.dropFirst()
        }
    case "--output":
        if let value = args.first {
            outputPath = String(value)
            args = args.dropFirst()
        }
    case "--created-only":
        includeUncreated = false
    case "--supports":
        if let value = args.first {
            selectedSupports = Set(value.split(separator: ",").map { String($0).uppercased() })
            args = args.dropFirst()
        }
    default:
        break
    }
}

func readJson(_ relativePath: String) throws -> [String: Any] {
    let url = repoRoot.appendingPathComponent(relativePath)
    let data = try Data(contentsOf: url)
    return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
}

func writeJson(_ value: Any, to url: URL) throws {
    let data = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .withoutEscapingSlashes])
    try data.write(to: url)
    try "\n".data(using: .utf8)!.append(to: url)
}

extension Data {
    func append(to url: URL) throws {
        if let handle = try? FileHandle(forWritingTo: url) {
            try handle.seekToEnd()
            try handle.write(contentsOf: self)
            try handle.close()
        } else {
            try self.write(to: url)
        }
    }
}

func cleanTitle(_ raw: String) -> String {
    var title = raw.replacingOccurrences(of: #"\s*(\||-)\s*FlashcardsLuna\s*$"#, with: "", options: .regularExpression)
    title = title.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
    return title.isEmpty ? "A1 Vocabulary" : title
}

func displayTitle(_ raw: String) -> String {
    let title = cleanTitle(raw)
    return title
        .replacingOccurrences(of: " | ", with: "\n")
        .replacingOccurrences(of: ": ", with: ":\n")
}

func titleParts(_ raw: String) -> (String, String) {
    let title = cleanTitle(raw)
    for separator in [" | ", ": "] {
        if let range = title.range(of: separator) {
            let head = String(title[..<range.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
            let tail = String(title[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
            return (head.isEmpty ? title : head, tail)
        }
    }
    return (title, "")
}

func safeSegment(_ raw: String) -> String {
    let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-")
    let mapped = raw.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" }
    let segment = String(mapped).replacingOccurrences(of: #"_+"#, with: "_", options: .regularExpression).trimmingCharacters(in: CharacterSet(charactersIn: "_"))
    return segment.isEmpty ? "playlist" : segment
}

func localizedBeginner(_ support: String) -> String {
    [
        "RU": "для начинающих",
        "EN": "for beginners",
        "EN-GB": "for beginners",
        "ES": "para principiantes",
        "ES-419": "para principiantes",
        "PT": "para iniciantes",
        "PT-BR": "para iniciantes",
        "TR": "yeni başlayanlar",
        "VI": "cho người mới bắt đầu",
        "SW": "kwa wanaoanza",
        "SR": "za početnike",
        "JA": "初心者向け",
        "TH": "สำหรับผู้เริ่มต้น",
        "NE": "सुरुवातीका लागि",
        "MY": "စတင်လေ့လာသူများအတွက်",
        "UZ": "boshlovchilar uchun",
        "SI": "ආරම්භකයින් සඳහා",
        "KA": "დამწყებთათვის",
    ][support] ?? ""
}

func localizedFooter(_ support: String) -> String {
    [
        "RU": "повседневные слова",
        "EN": "everyday vocabulary",
        "EN-GB": "everyday vocabulary",
        "ES": "vocabulario cotidiano",
        "ES-419": "vocabulario cotidiano",
        "PT": "vocabulário do dia a dia",
        "PT-BR": "vocabulário do dia a dia",
        "TR": "günlük kelimeler",
        "VI": "từ vựng hằng ngày",
        "SW": "msamiati wa kila siku",
        "SR": "svakodnevne reči",
        "JA": "日常語彙",
        "TH": "คำศัพท์ในชีวิตประจำวัน",
        "NE": "दैनिक शब्दहरू",
        "MY": "နေ့စဉ်သုံး ဝေါဟာရ",
        "UZ": "kundalik so‘zlar",
        "SI": "දෛනික වචන මාලාව",
        "KA": "ყოველდღიური ლექსიკა",
    ][support] ?? "everyday vocabulary"
}

func paragraph(_ alignment: NSTextAlignment = .left) -> NSMutableParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.alignment = alignment
    style.lineBreakMode = .byWordWrapping
    style.lineSpacing = 2
    return style
}

func attributed(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSAttributedString {
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    return NSAttributedString(
        string: text,
        attributes: [
            .font: font,
            .foregroundColor: color,
            .paragraphStyle: paragraph(),
        ]
    )
}

func fittingText(_ text: String, rect: NSRect, maxSize: CGFloat, minSize: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSAttributedString {
    var size = maxSize
    while size >= minSize {
        let value = attributed(text, size: size, weight: weight, color: color)
        let measured = value.boundingRect(with: rect.size, options: [.usesLineFragmentOrigin, .usesFontLeading])
        if measured.height <= rect.height && measured.width <= rect.width + 1 {
            return value
        }
        size -= 1
    }
    return attributed(text, size: minSize, weight: weight, color: color)
}

func drawRoundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
    if let stroke {
        stroke.setStroke()
        path.lineWidth = lineWidth
        path.stroke()
    }
}

func makeBitmap(width: Int, height: Int) throws -> NSBitmapImageRep {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        throw NSError(domain: "playlist-cover", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create bitmap canvas"])
    }
    rep.size = NSSize(width: width, height: height)
    return rep
}

func withBitmapContext<T>(_ rep: NSBitmapImageRep, _ body: () throws -> T) rethrows -> T {
    let context = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    defer { NSGraphicsContext.restoreGraphicsState() }
    return try body()
}

func saveJpeg(_ rep: NSBitmapImageRep, to url: URL, quality: CGFloat = 0.92) throws {
    guard let data = rep.representation(using: .jpeg, properties: [.compressionFactor: quality]) else {
        throw NSError(domain: "playlist-cover", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot encode JPEG"])
    }
    try data.write(to: url)
}

func renderCover(base: NSImage, playlist: [String: Any], to imageUrl: URL) throws -> [String: Any] {
    let support = (playlist["supportLang"] as? String ?? "").uppercased()
    let rawTitle = playlist["title"] as? String ?? playlist["playlist_key"] as? String ?? "A1 Vocabulary"
    let (headline, detail) = titleParts(rawTitle)
    let beginner = localizedBeginner(support)
    let footer = localizedFooter(support)

    let canvas = try makeBitmap(width: 1024, height: 1024)

    withBitmapContext(canvas) {
        NSColor.white.setFill()
        NSRect(x: 0, y: 0, width: 1024, height: 1024).fill()
        base.draw(in: NSRect(x: 0, y: 0, width: 1024, height: 1024))

        let panel = NSRect(x: 40, y: 1024 - 650, width: 610, height: 592)
        drawRoundedRect(
            panel,
            radius: 34,
            fill: NSColor(calibratedRed: 1, green: 1, blue: 0.98, alpha: 0.90),
            stroke: NSColor(calibratedRed: 0.91, green: 0.89, blue: 0.82, alpha: 0.75),
            lineWidth: 2
        )

        let pill = NSRect(x: 72, y: 1024 - 136, width: 244, height: 44)
        drawRoundedRect(
            pill,
            radius: 22,
            fill: NSColor(calibratedRed: 0.965, green: 0.988, blue: 0.976, alpha: 1),
            stroke: NSColor(calibratedRed: 0.75, green: 0.86, blue: 0.82, alpha: 1),
            lineWidth: 2
        )
        attributed("FlashcardsLuna", size: 28, weight: .regular, color: NSColor(calibratedRed: 0.15, green: 0.41, blue: 0.47, alpha: 1))
            .draw(in: NSRect(x: 96, y: 1024 - 130, width: 210, height: 34))

        let titleRect = NSRect(x: 72, y: 1024 - 360, width: 548, height: 192)
        let titleAttr = fittingText(
            headline,
            rect: titleRect,
            maxSize: 58,
            minSize: 25,
            weight: .bold,
            color: NSColor(calibratedRed: 0.031, green: 0.102, blue: 0.270, alpha: 1)
        )
        titleAttr.draw(with: titleRect, options: [.usesLineFragmentOrigin, .usesFontLeading])

        let badge = NSRect(x: 72, y: 1024 - 488, width: 124, height: 68)
        drawRoundedRect(badge, radius: 18, fill: NSColor(calibratedRed: 0.063, green: 0.541, blue: 0.388, alpha: 1))
        attributed("A1", size: 49, weight: .bold, color: .white)
            .draw(in: NSRect(x: 96, y: 1024 - 482, width: 80, height: 58))

        if !beginner.isEmpty {
            let beginnerRect = NSRect(x: 218, y: 1024 - 472, width: 385, height: 42)
            fittingText(
                beginner,
                rect: beginnerRect,
                maxSize: 29,
                minSize: 20,
                weight: .regular,
                color: NSColor(calibratedRed: 0.278, green: 0.353, blue: 0.435, alpha: 1)
            ).draw(with: beginnerRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
        }

        if !detail.isEmpty {
            let detailRect = NSRect(x: 72, y: 1024 - 565, width: 548, height: 78)
            fittingText(
                detail,
                rect: detailRect,
                maxSize: 38,
                minSize: 20,
                weight: .bold,
                color: NSColor(calibratedRed: 0.031, green: 0.102, blue: 0.270, alpha: 1)
            ).draw(with: detailRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
        }

        NSColor(calibratedRed: 0.063, green: 0.541, blue: 0.388, alpha: 1).setFill()
        NSBezierPath(ovalIn: NSRect(x: 76, y: 1024 - 612, width: 26, height: 26)).fill()
        let footerRect = NSRect(x: 118, y: 1024 - 619, width: 500, height: 50)
        fittingText(
            footer,
            rect: footerRect,
            maxSize: 30,
            minSize: 20,
            weight: .regular,
            color: NSColor(calibratedRed: 0.278, green: 0.353, blue: 0.435, alpha: 1)
        ).draw(with: footerRect, options: [.usesLineFragmentOrigin, .usesFontLeading])
    }

    try FileManager.default.createDirectory(at: imageUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
    try saveJpeg(canvas, to: imageUrl)

    return [
        "headline": headline,
        "detail": detail,
        "beginner": beginner,
        "footer": footer,
        "path": imageUrl.path.replacingOccurrences(of: repoRoot.path + "/", with: ""),
        "renderer": "swift-coretext",
    ]
}

func buildContactSheet(paths: [URL], output: URL, thumb: CGFloat = 160, columns: Int = 12) throws {
    guard !paths.isEmpty else { return }
    let rows = Int(ceil(Double(paths.count) / Double(columns)))
    let canvas = try makeBitmap(width: Int(CGFloat(columns) * thumb), height: Int(CGFloat(rows) * thumb))
    withBitmapContext(canvas) {
        NSColor(calibratedRed: 0.973, green: 0.980, blue: 0.988, alpha: 1).setFill()
        NSRect(x: 0, y: 0, width: CGFloat(columns) * thumb, height: CGFloat(rows) * thumb).fill()
        for (index, path) in paths.enumerated() {
            guard let img = NSImage(contentsOf: path) else { continue }
            let col = index % columns
            let row = index / columns
            let x = CGFloat(col) * thumb
            let y = CGFloat(rows - row - 1) * thumb
            img.draw(in: NSRect(x: x, y: y, width: thumb, height: thumb))
        }
    }
    try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
    try saveJpeg(canvas, to: output, quality: 0.88)
}

let playlistsRegistry = try readJson("config/youtube-playlists.json")
let channelsRegistry = try readJson("config/youtube-channels.json")
let playlists = playlistsRegistry["playlists"] as? [[String: Any]] ?? []
let channels = channelsRegistry["channels"] as? [[String: Any]] ?? []
let channelByKey = Dictionary(uniqueKeysWithValues: channels.compactMap { row -> (String, [String: Any])? in
    guard let key = row["key"] as? String else { return nil }
    return (key, row)
})

let baseUrl = repoRoot.appendingPathComponent(basePath)
guard let base = NSImage(contentsOf: baseUrl) else {
    throw NSError(domain: "playlist-cover", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot read base image \(basePath)"])
}

let outputRoot = repoRoot.appendingPathComponent(outputPath)
var records: [[String: Any]] = []
var skipped: [[String: Any]] = []
var pathsByChannel: [String: [URL]] = [:]

for playlist in playlists {
    let support = (playlist["supportLang"] as? String ?? "").uppercased()
    if !selectedSupports.isEmpty && !selectedSupports.contains(support) {
        continue
    }
    let channelKey = playlist["channelKey"] as? String ?? ""
    let channel = channelByKey[channelKey]
    guard channel?["customThumbnailUploadAllowed"] as? Bool == true else {
        skipped.append([
            "playlistKey": playlist["playlist_key"] as? String ?? "",
            "channelKey": channelKey,
            "reason": "custom_playlist_cover_not_allowed_for_channel",
        ])
        continue
    }
    let playlistId = playlist["youtube_playlist_id"] as? String ?? ""
    if !includeUncreated && playlistId.isEmpty {
        skipped.append([
            "playlistKey": playlist["playlist_key"] as? String ?? "",
            "channelKey": channelKey,
            "reason": "missing_youtube_playlist_id",
        ])
        continue
    }

    let playlistKey = playlist["playlist_key"] as? String ?? "\(playlist["supportLang"] as? String ?? "")__\(playlist["targetLang"] as? String ?? "")"
    let folder = outputRoot
        .appendingPathComponent("by-channel")
        .appendingPathComponent(safeSegment(channelKey))
        .appendingPathComponent(safeSegment(playlistKey))
    let imageUrl = folder.appendingPathComponent("playlist_cover.jpg")
    let render = try renderCover(base: base, playlist: playlist, to: imageUrl)
    let coverPath = imageUrl.path.replacingOccurrences(of: repoRoot.path + "/", with: "")
    let sidecar: [String: Any] = [
        "playlistKey": playlistKey,
        "supportLang": playlist["supportLang"] as? String ?? "",
        "targetLang": playlist["targetLang"] as? String ?? "",
        "channelKey": channelKey,
        "channelId": playlist["youtube_channel_id"] as? String ?? channel?["channelId"] as? String ?? "",
        "playlistId": playlistId,
        "title": playlist["title"] as? String ?? "",
        "description": playlist["description"] as? String ?? "",
        "status": playlist["status"] as? String ?? "",
        "coverPath": coverPath,
        "render": render,
        "uploadEligible": !playlistId.isEmpty,
        "uploadBlocker": playlistId.isEmpty ? "missing_youtube_playlist_id" : "",
    ]
    try writeJson(sidecar, to: folder.appendingPathComponent("playlist.json"))
    records.append(sidecar)
    pathsByChannel[channelKey, default: []].append(imageUrl)
}

for key in pathsByChannel.keys.sorted() {
    try buildContactSheet(paths: pathsByChannel[key] ?? [], output: outputRoot.appendingPathComponent("by-channel").appendingPathComponent(safeSegment(key)).appendingPathComponent("contact-sheet.jpg"))
}
let allPaths = records.compactMap { record -> URL? in
    guard let relative = record["coverPath"] as? String else { return nil }
    return repoRoot.appendingPathComponent(relative)
}
try buildContactSheet(paths: allPaths, output: outputRoot.appendingPathComponent("contact-sheet.jpg"), thumb: 128, columns: 18)

let manifest: [String: Any] = [
    "schemaVersion": 1,
    "generatedAt": ISO8601DateFormatter().string(from: Date()),
    "baseImage": basePath,
    "outputRoot": outputPath,
    "renderer": "swift-coretext",
    "selection": [
        "customThumbnailUploadAllowed": true,
        "includeUncreated": includeUncreated,
        "supports": selectedSupports.sorted(),
    ],
    "records": records,
    "skipped": skipped,
]
try writeJson(manifest, to: outputRoot.appendingPathComponent("manifest.json"))

let counts = Dictionary(uniqueKeysWithValues: pathsByChannel.keys.sorted().map { key in
    (key, pathsByChannel[key]?.count ?? 0)
})
let result: [String: Any] = [
    "status": "ok",
    "rendered": records.count,
    "skipped": skipped.count,
    "outputRoot": outputPath,
    "manifest": "\(outputPath)/manifest.json",
    "contactSheet": "\(outputPath)/contact-sheet.jpg",
    "channels": counts,
]
let resultData = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .withoutEscapingSlashes])
print(String(data: resultData, encoding: .utf8)!)
