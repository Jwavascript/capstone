-- D14: 실제 DB의 seed 샘플을 한 번 지움(샘플 이슈는 url이 네이버 첫 화면 주소인 것뿐, 샘플 폴더는 id · 이름이 f1~f3 샘플과 모두 같은 것)
-- 북마크(샘플 이슈를 가리키거나 샘플 폴더에 든 행) → 이슈 → 폴더 순서
DELETE FROM "bookmarks"
WHERE "issue_id" IN (SELECT "id" FROM "issues" WHERE "url" = 'https://news.naver.com/')
   OR "folder_id" IN (SELECT "id" FROM "folders" WHERE ("id", "name") IN (('f1', '반도체·AI'), ('f2', '부동산·금리'), ('f3', '나중에 읽기')));
--> statement-breakpoint
DELETE FROM "issues" WHERE "url" = 'https://news.naver.com/';
--> statement-breakpoint
DELETE FROM "folders" WHERE ("id", "name") IN (('f1', '반도체·AI'), ('f2', '부동산·금리'), ('f3', '나중에 읽기'));
