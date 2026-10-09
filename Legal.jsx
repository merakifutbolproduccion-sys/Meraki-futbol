// Página de información legal. El texto base se puede reemplazar desde el panel (FM Meraki → "Textos legales").
import {Async,useData,useTitle} from './ui'
import {api} from './api'

const BASE=`AVISO IMPORTANTE: este es un texto base de referencia. Recomendamos que un abogado lo revise y lo adapte antes de considerarlo definitivo.

1. QUIÉNES SOMOS Y CÓMO CONTACTARNOS
Este sitio es operado por FM Meraki y Meraki Fútbol, un medio digital de radio y fútbol argentino. Para consultas, reclamos o pedidos relacionados con este texto, escribinos desde la sección Contacto.

2. DERECHOS DE AUTOR
Los textos, crónicas, entrevistas, fotografías, gráficos, logos y demás contenidos originales publicados en este sitio pertenecen a sus autores y a Meraki Fútbol y están protegidos por la Ley de Propiedad Intelectual de la Argentina (Ley 11.723).
Se permite citar fragmentos breves con mención clara de la fuente y un enlace a la nota original. No se permite copiar o republicar notas completas, ni usar nuestras fotos o logos, sin autorización previa por escrito.

3. IMÁGENES Y MATERIAL DE TERCEROS
Algunas imágenes pueden provenir de clubes, prensa oficial, agencias, redes sociales o colaboradores, y se publican con fines informativos. Siempre que sea posible se indica la fuente. Si sos titular de una imagen o texto y querés que se acredite o se retire, escribinos desde Contacto indicando el link y tus datos, y lo revisaremos a la brevedad.

4. MARCAS, ESCUDOS Y NOMBRES
Los nombres, escudos y marcas de clubes, torneos, ligas, federaciones y medios que aparecen en el sitio pertenecen a sus respectivos titulares. Se usan solo para informar. Meraki Fútbol no tiene vínculo oficial con ellos, salvo que se indique expresamente.

5. OPINIONES Y ENTREVISTAS
Las opiniones y declaraciones de personas entrevistadas o de columnistas son responsabilidad de quienes las expresan y no necesariamente reflejan la postura de Meraki Fútbol. Si encontrás un error en una nota, escribinos y publicaremos la corrección o rectificación que corresponda.

6. PRIVACIDAD Y DATOS PERSONALES
Navegar el sitio no requiere registrarse. Podemos medir las visitas con herramientas de estadísticas como Google Analytics, que usan cookies o identificadores para contar visitas y páginas vistas de forma general. Podés bloquear las cookies desde la configuración de tu navegador.
Si nos escribís por mail, WhatsApp o redes, usamos tus datos solo para responderte. No los vendemos. Según la Ley 25.326 de Protección de los Datos Personales, tenés derecho a pedir acceso, corrección o eliminación de tus datos escribiéndonos desde Contacto. La Agencia de Acceso a la Información Pública es el órgano de control de esa ley.

7. COMENTARIOS DEL PÚBLICO
Quien deja un comentario nos informa su nombre, apellido y mensaje. Revisamos cada comentario antes de publicarlo y, si se aprueba, se muestran el nombre, el apellido y el mensaje en el sitio. Podemos no publicar o eliminar comentarios ofensivos, con datos personales de terceros, publicidad o contenido ilegal. Quien comentó puede pedir que se elimine su comentario escribiendo desde Contacto. Cada persona es responsable de lo que escribe.

8. ENLACES EXTERNOS Y REDES
El sitio puede enlazar a páginas, videos o redes de terceros. No controlamos su contenido ni sus políticas.

9. RADIO EN VIVO
La transmisión de FM Meraki incluye programas y música. Los derechos sobre los contenidos transmitidos pertenecen a sus titulares.

10. CAMBIOS
Podemos actualizar este texto cuando sea necesario. La versión vigente es la que aparece en esta página.`

export default function Legal(){
  useTitle('Legales y copyright')
  const s=useData(api.radio)
  return <div className="w"><h1>Legales y copyright</h1>
   <Async s={s}>{r=><><div className="paper" style={{whiteSpace:'pre-wrap',margin:0}}>{(r.legal||'').trim()||BASE}</div><p className="muted" style={{marginTop:12}}>© {new Date().getFullYear()} Meraki Fútbol / FM Meraki. Todos los derechos reservados.</p></>}</Async></div>}
