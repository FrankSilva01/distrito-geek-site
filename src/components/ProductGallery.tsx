import { useState } from 'react'
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [selected, setSelected] = useState(0), [origin, setOrigin] = useState('50% 50%')
  return <div className="gallery"><div className="thumbs">{images.map((src, i) => <button key={`${src}-${i}`} className={i === selected ? 'selected' : ''} aria-label={`Imagem ${i + 1} de ${title}`} onClick={() => setSelected(i)}><img src={src} alt=""/></button>)}</div><div className="main-image"><img data-testid="zoom-image" src={images[selected]} alt={title} style={{ transformOrigin: origin }} onPointerMove={(event) => { const r = event.currentTarget.getBoundingClientRect(); const x = Math.max(0, Math.min(100, ((event.clientX-r.left)/Math.max(1,r.width))*100)); const y = Math.max(0, Math.min(100, ((event.clientY-r.top)/Math.max(1,r.height))*100)); setOrigin(`${x}% ${y}%`) }}/></div></div>
}
