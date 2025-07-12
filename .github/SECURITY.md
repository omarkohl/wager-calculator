# Security Policy

## Supported Versions

We actively support the following versions of the Wager Calculator:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in the Wager Calculator, please report it responsibly:

### For Security Issues:
1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [omarkohl@posteo.net]
3. Include detailed information about the vulnerability
4. Provide steps to reproduce if possible

### What to Include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if you have one)

### Response Timeline:
- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity

## Security Considerations

### Mathematical Security
- All calculations use standard logarithmic scoring rules
- No user data is stored or transmitted
- All computations happen client-side

### Data Privacy
- No personal information is collected
- No bet data is stored or transmitted
- No cookies or tracking mechanisms

### Client-Side Security
- No server-side components to secure
- All code runs in the user's browser
- No authentication or user accounts

### Dependency Security
- Regular dependency updates
- Automated security auditing
- Minimal dependency footprint

## Security Best Practices for Users

### When Using the Calculator:
1. Always verify calculations manually for important bets
2. Use HTTPS when accessing the application
3. Keep your browser updated
4. Be cautious when sharing screenshots (they may contain sensitive information)

### When Self-Hosting:
1. Serve over HTTPS only
2. Use Content Security Policy headers
3. Keep dependencies updated
4. Regular security audits

## Known Limitations

### Mathematical Limitations:
- Extreme probability values may result in very large payouts
- Floating-point precision limits apply to all calculations
- No protection against unreasonable bet parameters

### Technical Limitations:
- Client-side only - no server-side validation
- Dependent on browser security model
- No rate limiting or abuse protection

## Disclosure Policy

Once a security issue is resolved:
1. We will publish a security advisory
2. Credit will be given to the reporter (unless they prefer anonymity)
3. A patch release will be made available
4. Users will be notified through appropriate channels

## Contact

For security-related questions or concerns:
- Email: [omarkohl@posteo.net]
- Response time: 48 hours maximum
