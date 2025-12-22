interface FooterProps {
  commitDate?: string
  commitHash?: string
  repoUrl?: string
}

export default function Footer({ commitDate, commitHash, repoUrl }: FooterProps) {
  const hasVersion =
    commitDate && commitDate !== 'unknown' && commitHash && commitHash !== 'unknown'
  const hasRepoUrl = repoUrl && repoUrl.trim() !== ''

  return (
    <footer className="border-t border-gray-200 bg-white py-4">
      <div className="mx-auto max-w-4xl space-y-2 px-4 text-sm text-gray-600 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            {hasVersion && (
              <span>
                Version:{' '}
                {hasRepoUrl ? (
                  <a
                    href={`${repoUrl}/commit/${commitHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {commitDate} ({commitHash})
                  </a>
                ) : (
                  <span>
                    {commitDate} ({commitHash})
                  </span>
                )}
              </span>
            )}
          </div>
          <div>
            {hasRepoUrl && (
              <a
                href={`${repoUrl}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Report a bug
              </a>
            )}
          </div>
        </div>
        <div className="text-center text-xs">
          Icon by{' '}
          <a
            href="https://www.freepik.com/icon/handshake_1006657"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Freepik
          </a>
        </div>
      </div>
    </footer>
  )
}
