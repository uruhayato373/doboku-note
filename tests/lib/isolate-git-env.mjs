/**
 * テストの一時リポジトリが親リポジトリを触らないよう、GIT_ で始まる環境変数をこのプロセスから外す（DN-0897）。
 * pre-commit の unit-tests は GIT_DIR・GIT_INDEX_FILE などを持ったまま走るので、引き継いだ子の `git init`・`git add` が
 * 親の .git/config（core.bare = true）や commit 用の index を書き換えた（2026-10-27）。
 * 一時リポジトリで git を呼ぶテストは、ほかの import より前にこのファイルを import する（tests/test-git-env-isolation.test.mjs が止める）。
 */
for (const key of Object.keys(process.env)) {
  if (key.startsWith('GIT_')) delete process.env[key];
}
