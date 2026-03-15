import { useState } from 'react';

const glassCard =
  'rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]';

function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const fileToBase64 = (value) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(value);
    });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.match('image.*')) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResults(null);
      setDoctors([]);
      setError('');
      return;
    }

    setFile(null);
    setPreviewUrl('');
    setError('Please select a valid image (JPG/PNG).');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
        setLocation(coords);
        setLoading(false);
      },
      () => {
        setError('Unable to detect location automatically.');
        setLoading(false);
      }
    );
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Upload an image first.');
      return;
    }

    if (!location.trim()) {
      setError('Enter your city or PIN code.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setDoctors([]);

    try {
      const base64Image = await fileToBase64(file);
      const analyzeRes = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType: file.type })
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || `HTTP ${analyzeRes.status}`);
      }

      const data = await analyzeRes.json();
      setResults(data);

      if (data.percentageLoss > 20) {
        const docRes = await fetch(`${API_BASE}/api/doctors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: location.trim(),
            specialty: 'dermatology'
          })
        });

        if (docRes.ok) {
          const docData = await docRes.json();
          setDoctors(docData.doctors || []);
        }
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setPreviewUrl('');
    setResults(null);
    setDoctors([]);
    setError('');
    setLocation('');
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#05060f] px-4 py-10 text-white">
      <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-28 right-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <div
        className={`relative z-10 mx-auto w-full max-w-6xl p-6 md:p-8 ${glassCard}`}
      >
        <header className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-6 text-center md:p-10">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-cyan-200/80">Hair Intelligence Studio</p>
          <h1 className="text-4xl font-semibold md:text-6xl bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">
            TrichoGlass AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-200 md:text-base">
            Apple-inspired glassmorphic scalp analyzer built for hair-loss grading, personalized guidance, and nearby specialist discovery.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${glassCard} p-5`}>
            <h2 className="mb-4 text-lg font-semibold text-white/90">1. Upload Hair/Scalp Photo</h2>
            <input id="upload" type="file" accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden" />
            <label
              htmlFor="upload"
              className="block cursor-pointer rounded-2xl border border-dashed border-cyan-100/40 bg-black/20 p-6 text-center hover:border-cyan-200/70"
            >
              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="Scalp preview" className="mx-auto max-h-64 rounded-2xl object-cover shadow-xl" />
                  <p className="mt-3 text-sm text-emerald-200">Image ready for analysis</p>
                </div>
              ) : (
                <div className="py-8">
                  <p className="text-4xl">📸</p>
                  <p className="mt-3 font-medium text-white">Tap to upload image</p>
                  <p className="text-sm text-slate-300">Use a clear top/headline scalp view (JPG/PNG)</p>
                </div>
              )}
            </label>
          </section>

          <section className={`${glassCard} p-5`}>
            <h2 className="mb-4 text-lg font-semibold text-white/90">2. Location & Analyze</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or PIN code"
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-300 focus:border-cyan-200 focus:outline-none"
                />
                <button
                  onClick={detectLocation}
                  disabled={loading}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 hover:bg-white/20"
                >
                  {loading ? '⌛' : '📍'}
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!file || !location || loading}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 py-3 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Analyzing hair health...' : 'Start Hair Analysis'}
              </button>

              {error && <p className="rounded-xl border border-rose-300/40 bg-rose-500/20 p-3 text-sm text-rose-100">⚠️ {error}</p>}
            </div>
          </section>
        </div>

        {results && (
          <section className="mt-8">
            <div className="mb-5 flex gap-2 border-b border-white/10 pb-3">
              {['analysis', 'doctors'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    activeTab === tab ? 'bg-white/20 text-cyan-100' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {tab === 'analysis' ? '📊 Analysis' : `👨‍⚕️ Doctors (${doctors.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'analysis' ? (
              <div className="grid gap-4 md:grid-cols-3">
                <article className={`${glassCard} p-4 text-center`}>
                  <p className="text-xs text-slate-300">Hair Loss Grade</p>
                  <p className="mt-2 text-2xl font-semibold">{results.grade}</p>
                </article>
                <article className={`${glassCard} p-4 text-center`}>
                  <p className="text-xs text-slate-300">Affected Area</p>
                  <p className="mt-2 text-2xl font-semibold">{results.percentageLoss}%</p>
                </article>
                <article className={`${glassCard} p-4 text-center`}>
                  <p className="text-xs text-slate-300">Recommendation</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-200">
                    {results.percentageLoss > 30 ? 'Consult Doctor' : 'Monitor & Care'}
                  </p>
                </article>

                <article className={`${glassCard} p-5 md:col-span-2`}>
                  <h3 className="mb-2 text-lg font-semibold text-cyan-100">Summary</h3>
                  <p className="text-sm text-slate-100">{results.analysisSummary}</p>
                </article>
                <article className={`${glassCard} p-5`}>
                  <h3 className="mb-2 text-lg font-semibold text-fuchsia-100">Hair Tips</h3>
                  <ul className="space-y-2 text-sm text-slate-100">
                    {results.tips?.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </article>

                <article className={`${glassCard} p-5 md:col-span-3`}>
                  <h3 className="mb-2 text-lg font-semibold text-amber-100">Doctor Advice</h3>
                  <p className="text-sm text-slate-100">{results.doctorConsultationAdvice}</p>
                </article>
              </div>
            ) : doctors.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {doctors.map((doc, i) => (
                  <article key={i} className={`${glassCard} p-5`}>
                    <p className="text-lg font-semibold">{doc.name}</p>
                    <p className="text-sm text-cyan-100">{doc.qualification}</p>
                    <p className="mt-3 text-sm text-slate-200">🏥 {doc.address || 'Address not available'}</p>
                    <p className="text-sm text-slate-200">📞 {doc.phone || 'Phone not available'}</p>
                    <p className="mt-2 text-xs text-slate-300">Reg: {doc.registration || 'N/A'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/15 bg-white/5 p-5 text-slate-200">
                No dermatologists found for this location yet. Try nearby cities or PIN code.
              </p>
            )}

            <div className="mt-8 text-center">
              <button onClick={resetApp} className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-sm hover:bg-white/20">
                🔄 New Analysis
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
