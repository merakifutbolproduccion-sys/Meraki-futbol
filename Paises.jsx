// Lista de países y territorios con asociación miembro de la FIFA (211), ordenados por confederación.
// Si falta alguno, la opción "Otro país o territorio…" permite escribirlo a mano.
import {useState} from 'react'
const L=s=>s.split('|')
export const GRUPOS=[
 ['Sudamérica (CONMEBOL)',L('Argentina|Bolivia|Brasil|Chile|Colombia|Ecuador|Paraguay|Perú|Uruguay|Venezuela')],
 ['Europa (UEFA)',L('Albania|Alemania|Andorra|Armenia|Austria|Azerbaiyán|Bélgica|Bielorrusia|Bosnia y Herzegovina|Bulgaria|Chipre|Croacia|Dinamarca|Escocia|Eslovaquia|Eslovenia|España|Estonia|Finlandia|Francia|Gales|Georgia|Gibraltar|Grecia|Hungría|Inglaterra|Irlanda|Irlanda del Norte|Islandia|Islas Feroe|Israel|Italia|Kazajistán|Kosovo|Letonia|Liechtenstein|Lituania|Luxemburgo|Macedonia del Norte|Malta|Moldavia|Montenegro|Noruega|Países Bajos|Polonia|Portugal|República Checa|Rumania|Rusia|San Marino|Serbia|Suecia|Suiza|Turquía|Ucrania')],
 ['Norte y Centroamérica y Caribe (CONCACAF)',L('Anguila|Antigua y Barbuda|Aruba|Bahamas|Barbados|Belice|Bermudas|Canadá|Costa Rica|Cuba|Curazao|Dominica|El Salvador|Estados Unidos|Granada|Guatemala|Guyana|Haití|Honduras|Islas Caimán|Islas Turcas y Caicos|Islas Vírgenes Británicas|Islas Vírgenes de EE. UU.|Jamaica|México|Montserrat|Nicaragua|Panamá|Puerto Rico|República Dominicana|San Cristóbal y Nieves|San Vicente y las Granadinas|Santa Lucía|Surinam|Trinidad y Tobago')],
 ['África (CAF)',L('Angola|Argelia|Benín|Botsuana|Burkina Faso|Burundi|Cabo Verde|Camerún|Chad|Comoras|Congo|Costa de Marfil|Egipto|Eritrea|Esuatini|Etiopía|Gabón|Gambia|Ghana|Guinea|Guinea Ecuatorial|Guinea-Bisáu|Kenia|Lesoto|Liberia|Libia|Madagascar|Malaui|Malí|Marruecos|Mauricio|Mauritania|Mozambique|Namibia|Níger|Nigeria|República Centroafricana|República Democrática del Congo|Ruanda|Santo Tomé y Príncipe|Senegal|Seychelles|Sierra Leona|Somalia|Sudáfrica|Sudán|Sudán del Sur|Tanzania|Togo|Túnez|Uganda|Yibuti|Zambia|Zimbabue')],
 ['Asia (AFC)',L('Afganistán|Arabia Saudita|Australia|Baréin|Bangladés|Brunéi|Bután|Camboya|Catar|China|Corea del Norte|Corea del Sur|Emiratos Árabes Unidos|Filipinas|Guam|Hong Kong|India|Indonesia|Irak|Irán|Japón|Jordania|Kirguistán|Kuwait|Laos|Líbano|Macao|Malasia|Maldivas|Mongolia|Myanmar|Nepal|Omán|Pakistán|Palestina|Singapur|Siria|Sri Lanka|Tailandia|Taipéi Chino (Taiwán)|Tayikistán|Timor Oriental|Turkmenistán|Uzbekistán|Vietnam|Yemen')],
 ['Oceanía (OFC)',L('Fiyi|Islas Cook|Islas Salomón|Nueva Caledonia|Nueva Zelanda|Papúa Nueva Guinea|Samoa|Samoa Americana|Tahití|Tonga|Vanuatu')]]
export const PAISES=GRUPOS.flatMap(g=>g[1])
const sorted=GRUPOS.map(([g,l])=>[g,[...l].sort((a,b)=>a.localeCompare(b,'es'))])

// Desplegable de países. Sirve dentro de un <form> (campo "name") o con value/onChange.
export function PaisSelect({name,value,onChange,label='País del club',compact}){
 const ini=value||'',[v,setV]=useState(ini),[otro,setOtro]=useState(!!ini&&!PAISES.includes(ini))
 const set=x=>{setV(x);onChange?.(x)}
 const sel=otro?'__otro':v
 return <>{!compact&&<label>{label}</label>}
  <select aria-label={label} value={sel} style={compact?{width:'auto'}:null} onChange={e=>{const x=e.target.value;if(x==='__otro'){setOtro(true);set('')}else{setOtro(false);set(x)}}}>
   <option value="">— Elegí el país —</option>
   {sorted.map(([g,l])=><optgroup key={g} label={g}>{l.map(p=><option key={p} value={p}>{p}</option>)}</optgroup>)}
   <option value="__otro">Otro país o territorio…</option></select>
  {otro&&<input aria-label="Escribí el país o territorio" placeholder="Escribí el país o territorio" value={v} onChange={e=>set(e.target.value)} style={compact?{width:'auto'}:null}/>}
  {name&&<input type="hidden" name={name} value={v}/>}</>}
