#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    config: "config/youtube-channels.json",
    scope: "manual-needed",
    outputDir: "outputs/youtube-channel-assets",
  };
  for (const arg of argv) {
    if (arg === "--all") options.scope = "all";
    else if (arg === "--manual-needed") options.scope = "manual-needed";
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--config=")) options.config = arg.slice("--config=".length);
    else if (arg.startsWith("--output-dir=")) options.outputDir = arg.slice("--output-dir=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/export-youtube-channel-studio-tasks.mjs [--manual-needed|--all]",
    "",
    "Exports non-secret YouTube Studio finishing tasks for browser/Record & Replay work.",
  ].join("\n");
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function needsManual(channel) {
  if (channel.profileStatus === "needs_public_link_fix") return true;
  if (!["configured_readback", "studio_complete"].includes(channel.profileStatus)) return true;
  if (/^new/i.test(String(channel.currentHandle || ""))) return true;
  return false;
}

function studioUrl(channel) {
  return channel.channelId
    ? `https://studio.youtube.com/channel/${channel.channelId}/editing`
    : "";
}

function taskFor(channel, defaults) {
  const siteLink = channel.siteCoursesUrl || "";
  const currentHandle = String(channel.currentHandle || "").replace(/^@/, "");
  const targetHandle = String(channel.targetHandle || currentHandle).replace(/^@/, "");
  const actions = [
    {
      field: "Channel name",
      desired: channel.finalChannelName || "",
      verification: "Public channel header and /about page show the desired name.",
    },
    {
      field: "Handle",
      desired: targetHandle ? `@${targetHandle}` : "",
      verification: "Public channel URL resolves to the desired handle and channelId stays unchanged.",
    },
    {
      field: "Avatar / picture",
      desiredAsset: channel.avatarAsset || defaults.avatarAsset || "",
      verification: "Public channel avatar shows the LunaCards logo.",
    },
    {
      field: "External link",
      desired: siteLink,
      verification: "Public /about page exposes the clickable flashcardsluna.com course link, not only text in description.",
    },
    {
      field: "Contact email",
      desiredSource: ".local/youtube-channel-defaults.json contactEmail",
      verification: "YouTube Studio basic info has the contact email set; do not copy the value into repo files.",
    },
  ];

  return {
    key: channel.key,
    supportLangs: channel.supportLangs || [],
    channelId: channel.channelId || "",
    currentHandle: currentHandle ? `@${currentHandle}` : "",
    targetHandle: targetHandle ? `@${targetHandle}` : "",
    publicUrl: channel.publicUrl || (targetHandle ? `https://www.youtube.com/@${targetHandle}` : ""),
    studioCustomizationUrl: studioUrl(channel),
    finalChannelName: channel.finalChannelName || "",
    desiredDescription: channel.desiredDescription || "",
    siteCoursesUrl: siteLink,
    bannerAsset: channel.bannerAsset || "",
    avatarAsset: channel.avatarAsset || defaults.avatarAsset || "",
    watermarkAsset: channel.watermarkAsset || defaults.watermarkAsset || "",
    profileStatus: channel.profileStatus || "",
    manualNeeded: needsManual(channel),
    actions,
    browserWorkflow: [
      "Open studioCustomizationUrl in the signed-in Chrome profile.",
      "Confirm the visible channelId/handle matches this task before editing.",
      "Use YouTube Studio Customization > Basic info / Branding fields.",
      "Save/publish changes in Studio.",
      "Open the publicUrl /about page and verify name, handle, avatar and site link.",
      "Update the Google Sheet tracker after public readback; never write token paths or contact email values.",
    ],
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(tasks) {
  const columns = [
    "key",
    "supportLangs",
    "channelId",
    "currentHandle",
    "targetHandle",
    "finalChannelName",
    "publicUrl",
    "studioCustomizationUrl",
    "siteCoursesUrl",
    "avatarAsset",
    "bannerAsset",
    "profileStatus",
  ];
  return [
    columns.join(","),
    ...tasks.map((task) => columns.map((column) => {
      const value = Array.isArray(task[column]) ? task[column].join("|") : task[column];
      return csvEscape(value);
    }).join(",")),
  ].join("\n") + "\n";
}

function toMarkdown(tasks) {
  const lines = [
    "# YouTube Studio Profile Tasks",
    "",
    "Non-secret browser checklist for channel name, handle, avatar, contact email and profile links.",
    "Contact email value lives only in `.local/youtube-channel-defaults.json` and must not be pasted into committed files.",
    "",
  ];
  for (const task of tasks) {
    lines.push(`## ${task.key.toUpperCase()} - ${task.finalChannelName}`);
    lines.push("");
    lines.push(`- Public: ${task.publicUrl}`);
    lines.push(`- Studio: ${task.studioCustomizationUrl}`);
    lines.push(`- Current handle: ${task.currentHandle}`);
    lines.push(`- Target handle: ${task.targetHandle}`);
    lines.push(`- Course link: ${task.siteCoursesUrl}`);
    lines.push(`- Avatar: ${task.avatarAsset}`);
    lines.push(`- Banner: ${task.bannerAsset}`);
    lines.push("");
    lines.push("Checklist:");
    for (const action of task.actions) {
      lines.push(`- ${action.field}: ${action.desired || action.desiredAsset || action.desiredSource}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const config = JSON.parse(fs.readFileSync(options.config, "utf8"));
  const defaults = config.defaults || {};
  const allTasks = config.channels.map((channel) => taskFor(channel, defaults));
  const tasks = options.scope === "all" ? allTasks : allTasks.filter((task) => task.manualNeeded);
  const slug = timestampSlug();
  const jsonPath = path.join(options.outputDir, `youtube-channel-studio-tasks-${slug}.json`);
  const csvPath = path.join(options.outputDir, `youtube-channel-studio-tasks-${slug}.csv`);
  const mdPath = path.join(options.outputDir, `youtube-channel-studio-tasks-${slug}.md`);
  fs.mkdirSync(options.outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    scope: options.scope,
    sourceConfig: options.config,
    count: tasks.length,
    tasks,
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(csvPath, toCsv(tasks), "utf8");
  fs.writeFileSync(mdPath, toMarkdown(tasks), "utf8");
  console.log(JSON.stringify({ status: "ok", scope: options.scope, count: tasks.length, jsonPath, csvPath, mdPath }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
