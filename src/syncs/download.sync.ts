import { actions, Sync } from "@engine";
import { DownloadAnalyzing, Requesting } from "@concepts";

export const DownloadRequest: Sync = ({ request, item, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/concepts/download", item, user },
    { request },
  ]),
  then: actions([DownloadAnalyzing.record, { item, user, at: Date.now() }]),
});

export const DownloadRespond: Sync = ({ request, download }) => ({
  when: actions(
    [Requesting.request, { path: "/concepts/download" }, { request }],
    [DownloadAnalyzing.record, {}, { download }],
  ),
  then: actions([Requesting.respond, { request, download }]),
});
