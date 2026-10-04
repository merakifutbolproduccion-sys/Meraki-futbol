import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import App from './App'
import './styles.css'
class EB extends React.Component{state={e:null};static getDerivedStateFromError(e){return{e}};render(){return this.state.e?<div style={{padding:20,background:'#eef2ee',color:'#0b1a11'}}><h3>Algo falló en la página</h3><p>{String(this.state.e.message||this.state.e)}</p><a href="/">Volver al inicio</a></div>:this.props.children}}
createRoot(document.getElementById('root')).render(<BrowserRouter><EB><App/></EB></BrowserRouter>)
