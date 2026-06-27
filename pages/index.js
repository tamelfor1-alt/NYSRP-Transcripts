export default function Home() {
  return (
    <main className="home">
      <h1>New York State Roleplay Transcripts</h1>
      <p>Open a transcript link to view a saved ticket transcript.</p>

      <style jsx>{`
        .home {
          min-height: 100vh;
          background: #313338;
          color: #f2f3f5;
          font-family: Arial, sans-serif;
          padding: 48px;
        }

        p {
          color: #b5bac1;
        }
      `}</style>
    </main>
  );
}
