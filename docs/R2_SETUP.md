# Cloudflare R2 — setup

Student and manager photos live in an R2 bucket. R2 is S3-compatible, charges
nothing for egress, and its free tier is 10 GB — against the 56 MB of photos the
old site accumulated in three years, so this stays free indefinitely.

You need four values in `.env`. Here is exactly where each one comes from.

---

## 1. Create the bucket

1. Sign in at <https://dash.cloudflare.com> with the same account that already
   holds `abcedupro.com`.
2. In the left sidebar choose **R2 Object Storage**.
3. The first time only, R2 asks you to add a payment method. **Adding a card does
   not start a charge** — the 10 GB free tier applies regardless, and you can set
   a spend cap. If you'd rather not, see "No card?" at the bottom.
4. Click **Create bucket**.
   - **Name**: `abcedupro`
   - **Location**: Automatic, or Asia-Pacific if offered
   - **Storage class**: Standard
5. Create.

➜ This gives you `R2_BUCKET="abcedupro"`.

## 2. Account ID

On the **R2 Object Storage** overview page, the right-hand panel shows
**Account ID** with a copy button. It's a 32-character hex string.

➜ `R2_ACCOUNT_ID="…"`

(The same value appears in any dashboard URL: `dash.cloudflare.com/<account id>/r2`.)

## 3. API token → access key + secret

1. From **R2 Object Storage**, open **API** (top right) → **Manage API tokens**.
   (On some accounts this is **Manage R2 API tokens**.)
2. **Create API token** → **Create Account API token**.
3. Fill in:
   - **Token name**: `abcedupro-app`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket(s)**: choose `abcedupro` — not "all buckets"
   - **TTL**: Forever
4. **Create Account API Token**.
5. The next screen shows, once and never again:
   - **Access Key ID**
   - **Secret Access Key**

   Copy both now.

➜ `R2_ACCESS_KEY_ID="…"` and `R2_SECRET_ACCESS_KEY="…"`

That screen also shows an "S3 endpoint" like
`https://<account id>.r2.cloudflarestorage.com`. You don't need to set it — the
app builds it from `R2_ACCOUNT_ID`.

## 4. Public URL for the bucket

Uploads are private by default, but student photos have to be readable by a
browser (they appear on marksheets and in the panels). Pick one:

### Option A — your own subdomain (recommended)

1. Open the bucket → **Settings** → **Public access** → **Custom Domains** →
   **Connect Domain**.
2. Enter `cdn.abcedupro.com`.
3. Cloudflare adds the DNS record itself, since it already runs your DNS.
   Wait for the status to go green (usually under a minute).

➜ `R2_PUBLIC_BASE_URL="https://cdn.abcedupro.com"`

### Option B — the r2.dev subdomain (quick, for testing)

1. Bucket → **Settings** → **Public access** → **R2.dev subdomain** → **Allow Access**.
2. Copy the URL, e.g. `https://pub-1234abcd.r2.dev`.

➜ `R2_PUBLIC_BASE_URL="https://pub-1234abcd.r2.dev"`

The r2.dev subdomain is rate-limited and not meant for production traffic —
fine while you're testing, switch to Option A before going live.

---

## 5. Fill in `.env`

```dotenv
R2_ACCOUNT_ID="your 32-char account id"
R2_ACCESS_KEY_ID="from step 3"
R2_SECRET_ACCESS_KEY="from step 3"
R2_BUCKET="abcedupro"
R2_PUBLIC_BASE_URL="https://cdn.abcedupro.com"
```

Restart `npm run dev`. Until all five are set, photo upload is skipped and the
rest of the app works normally — so you can build and test without R2.

## 6. Verify

```bash
npm run r2:check
```

Uploads a tiny test object, reads it back over the public URL, then deletes it.
It prints which of the five variables is wrong if something fails.

---

## Moving the 2,609 existing photos

Once the bucket works, copy the old files across with `rclone`, preserving the
`student_photo/{student_id}/{filename}` structure — that layout is what lets
certificates already in circulation keep resolving.

```bash
brew install rclone

rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id=YOUR_ACCESS_KEY \
  secret_access_key=YOUR_SECRET \
  endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  acl=private

# download public_html/student_photo/ from cPanel File Manager first, then:
rclone copy ./student_photo r2:abcedupro/student_photo --progress
rclone copy ./manager       r2:abcedupro/manager       --progress

rclone size r2:abcedupro    # expect ~2,609 objects, ~56 MB
```

You do **not** need to rewrite the URLs stored in the database. Rows hold
absolute URLs like `https://abcedupro.com/student_photo/412/photo.jpg`, and
`resolvePhotoUrl()` in `src/lib/storage.ts` rewrites that prefix to
`R2_PUBLIC_BASE_URL` when serving. Keep the old host answering as well and
previously issued certificates keep working either way.

---

## No card?

If you'd rather not add a payment method, the app talks plain S3 — any
S3-compatible store works by changing the endpoint in `src/lib/storage.ts`:

- **Backblaze B2** — 10 GB free, no card for the free tier
- **Supabase Storage** — 1 GB free, bundled with a Postgres project

At 56 MB and roughly 1,300 new students a year, a 1 GB tier lasts over a decade.
