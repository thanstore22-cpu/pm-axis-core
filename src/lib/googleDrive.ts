import type { GdUser } from '../types'

const DEFAULT_CLIENT_ID = '1039103431882-rgjlpnji3gv0cnfdgc4v3kjq58ursp3k.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

declare const google: any

let accessToken: string | null = null

export function getClientId(): string {
  return localStorage.getItem('gd_client_id') || DEFAULT_CLIENT_ID
}
export function setClientId(id: string): void {
  localStorage.setItem('gd_client_id', id)
}
export function isConnected(): boolean { return !!accessToken }

export function signIn(
  onSuccess: (user: GdUser) => void,
  onError:   (msg: string)  => void
): void {
  if (typeof google === 'undefined' || !google.accounts) {
    onError('Google Identity Services not loaded'); return
  }
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: SCOPES + ' email profile openid',
    callback: async (resp: any) => {
      if (resp.error) { onError('Sign-in failed: ' + resp.error); return }
      accessToken = resp.access_token
      try {
        const user: GdUser = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: 'Bearer ' + accessToken },
        }).then(r => r.json())
        onSuccess(user)
      } catch {
        onError('Failed to get user info')
      }
    },
  })
  tokenClient.requestAccessToken({ prompt: 'consent' })
}

export function signOut(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {})
    accessToken = null
  }
}

export async function listDriveFiles(): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  if (!accessToken) return []
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=name contains 'pm_axis' and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc",
    { headers: { Authorization: 'Bearer ' + accessToken } }
  )
  const data = await res.json()
  return data.files || []
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken },
  })
  return res.arrayBuffer()
}

export async function uploadFile(fileName: string, xlsxBuffer: ArrayBuffer, existingFileId?: string | null): Promise<{ id: string }> {
  const meta = { name: fileName, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file',     new Blob([xlsxBuffer], { type: meta.mimeType }))
  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { Authorization: 'Bearer ' + accessToken },
    body: form,
  })
  return res.json()
}
