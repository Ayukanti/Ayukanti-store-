export const metadata = {
  title: 'Ayukanti - Pure Ayurveda & POS',
  description: 'Shuddha Ayurveda, Jeevan Mein Nayee Kanti',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#041710', color: '#F6F1E8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
