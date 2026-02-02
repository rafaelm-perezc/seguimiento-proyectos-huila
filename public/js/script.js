document.addEventListener('DOMContentLoaded', () => {
    
    // --- REFERENCIAS UI ---
    const trackingForm = document.getElementById('trackingForm');
    const projectIdField = document.getElementById('projectId');
    const jsonUbicacionesField = document.getElementById('jsonUbicaciones');
    
    // Botones
    const btnNewProject = document.getElementById('btnNewProject');
    const btnCancel = document.getElementById('btnCancel');
    const btnAddLocation = document.getElementById('btnAddLocation');
    
    // Financiero
    const chkRp = document.getElementById('chkRp'); const txtRp = document.getElementById('txtRp');
    const chkSgp = document.getElementById('chkSgp'); const txtSgp = document.getElementById('txtSgp');
    const chkMen = document.getElementById('chkMen'); const txtMen = document.getElementById('txtMen');
    const chkSgr = document.getElementById('chkSgr'); const txtSgr = document.getElementById('txtSgr');
    const txtValorTotalManual = document.getElementById('txtValorTotalManual');
    const lblTotal = document.getElementById('lblTotal');

    // Ubicación Local (Inputs temporales)
    const selectMunicipio = document.getElementById('selectMunicipio');
    const txtNewMunicipio = document.getElementById('txtNewMunicipio');
    const selectInstitucion = document.getElementById('selectInstitucion');
    const txtNewInstitucion = document.getElementById('txtNewInstitucion');
    const selectSede = document.getElementById('selectSede');
    const txtNewSede = document.getElementById('txtNewSede');
    const txtAvanceLocal = document.getElementById('txtAvanceLocal');
    const txtObservacionesLocal = document.getElementById('txtObservacionesLocal');
    
    const locationsTableBody = document.querySelector('#locationsTable tbody');
    
    // Otros
    const selectActividad = document.getElementById('selectActividad');
    const txtNuevaActividad = document.getElementById('txtNuevaActividad');
    const newActivityContainer = document.getElementById('newActivityContainer');
    const selectIndicador = document.getElementById('selectIndicador');
    const txtResponsable = document.getElementById('txtResponsable');
    const chkEditResp = document.getElementById('chkEditResp');

    // ARRAY PARA ALMACENAR SEDES TEMPORALMENTE
    let locationsList = [];

    // Init
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txtFecha').value = today;
    loadMunicipios();
    loadIndicadores();

    // --- LÓGICA FINANCIERA MIXTA ---
    function toggleFinance(chk, input) {
        chk.addEventListener('change', () => {
            if(chk.checked) { input.classList.remove('hidden'); input.focus(); }
            else { input.classList.add('hidden'); input.value = ''; calculateTotal(); }
        });
        input.addEventListener('input', calculateTotal);
    }
    toggleFinance(chkRp, txtRp); toggleFinance(chkSgp, txtSgp);
    toggleFinance(chkMen, txtMen); toggleFinance(chkSgr, txtSgr);
    txtValorTotalManual.addEventListener('input', calculateTotal);

    function calculateTotal() {
        const v1 = parseFloat(txtRp.value) || 0;
        const v2 = parseFloat(txtSgp.value) || 0;
        const v3 = parseFloat(txtMen.value) || 0;
        const v4 = parseFloat(txtSgr.value) || 0;
        const vManual = parseFloat(txtValorTotalManual.value) || 0;
        
        let total = v1 + v2 + v3 + v4;
        if (total === 0 && vManual > 0) total = vManual;
        
        lblTotal.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(total);
    }

    // --- CHECKBOX RESPONSABLE (LÓGICA MANUAL) ---
    chkEditResp.addEventListener('change', () => {
        if(chkEditResp.checked) {
            txtResponsable.disabled = false;
            txtResponsable.readOnly = false;
            txtResponsable.classList.remove('input-readonly'); // Quitar clase gris
            txtResponsable.style.backgroundColor = '#ffffff';    // Forzar blanco
            txtResponsable.focus();
        } else {
            txtResponsable.disabled = true;
            txtResponsable.readOnly = true;
            txtResponsable.classList.add('input-readonly');      // Poner clase gris
            txtResponsable.style.backgroundColor = '#e9ecef';    // Forzar gris
            txtResponsable.value = ""; // Opcional: limpiar si se deshabilita
        }
    });

    // --- AGREGAR SEDE A LA LISTA ---
    btnAddLocation.addEventListener('click', () => {
        if (!selectMunicipio.value) return Swal.fire('Falta Municipio', 'Selecciona un municipio', 'warning');
        if (!selectInstitucion.value) return Swal.fire('Falta Institución', 'Selecciona una institución', 'warning');
        if (!selectSede.value) return Swal.fire('Falta Sede', 'Selecciona una sede', 'warning');
        if (txtAvanceLocal.value === '') return Swal.fire('Falta Avance', 'Ingresa el % de avance', 'warning');

        const munName = selectMunicipio.value.startsWith('new_') ? txtNewMunicipio.value.toUpperCase() : selectMunicipio.options[selectMunicipio.selectedIndex].text;
        const instName = selectInstitucion.value.startsWith('new_') ? txtNewInstitucion.value.toUpperCase() : selectInstitucion.options[selectInstitucion.selectedIndex].text;
        const sedeName = selectSede.value.startsWith('new_') ? txtNewSede.value.toUpperCase() : selectSede.options[selectSede.selectedIndex].text;

        const locationObj = {
            municipio_id: selectMunicipio.value,
            institucion_id: selectInstitucion.value,
            sede_id: selectSede.value,
            nombre_municipio_nuevo: selectMunicipio.value.startsWith('new_') ? txtNewMunicipio.value.toUpperCase() : null,
            nombre_institucion_nueva: selectInstitucion.value.startsWith('new_') ? txtNewInstitucion.value.toUpperCase() : null,
            nombre_sede_nueva: selectSede.value.startsWith('new_') ? txtNewSede.value.toUpperCase() : null,
            municipio_nombre: munName,
            institucion_nombre: instName,
            sede_nombre: sedeName,
            avance: txtAvanceLocal.value,
            observaciones: txtObservacionesLocal.value.toUpperCase()
        };

        locationsList.push(locationObj);
        renderLocationsTable();
        
        selectSede.value = ""; txtNewSede.value = ""; txtNewSede.classList.add('hidden');
        txtAvanceLocal.value = ""; txtObservacionesLocal.value = "";
        selectSede.focus();
    });

    function renderLocationsTable() {
        locationsTableBody.innerHTML = '';
        if (locationsList.length === 0) {
            locationsTableBody.innerHTML = '<tr id="emptyRow"><td colspan="5" style="text-align:center; padding: 15px; color: #999;">No has agregado sedes aún.</td></tr>';
            return;
        }

        locationsList.forEach((loc, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 5px;">${loc.municipio_nombre}</td>
                <td style="padding: 5px;">${loc.institucion_nombre}</td>
                <td style="padding: 5px;">${loc.sede_nombre}</td>
                <td style="padding: 5px; text-align: center;">${loc.avance}%</td>
                <td style="padding: 5px; text-align: center;">
                    <button type="button" class="btn-cancel" onclick="removeLocation(${index})" style="padding: 2px 8px; font-size: 0.8rem;">🗑️</button>
                </td>
            `;
            locationsTableBody.appendChild(tr);
        });
    }

    window.removeLocation = (index) => {
        locationsList.splice(index, 1);
        renderLocationsTable();
    };


    // --- GUARDAR FORMULARIO ---
    trackingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (locationsList.length === 0) {
            return Swal.fire('Lista Vacía', 'Debes agregar al menos una sede a la lista (Botón Naranja) antes de guardar.', 'warning');
        }

        jsonUbicacionesField.value = JSON.stringify(locationsList);
        
        const formData = new FormData(trackingForm);
        const data = Object.fromEntries(formData.entries());
        data.es_adicion = document.getElementById('chkAdicion').checked ? 'on' : 'off';

        try {
            const res = await fetch('/api/save', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify(data) 
            });
            const resp = await res.json();
            
            if(resp.success) {
                Swal.fire('Éxito', resp.message, 'success').then(() => {
                    resetForm();
                    trackingForm.classList.add('hidden');
                });
            } else {
                Swal.fire('Error', resp.error, 'error');
            }
        } catch (err) { Swal.fire('Error', 'Fallo de red', 'error'); }
    });

    // --- RESET FORM ---
    function resetForm() {
        trackingForm.reset(); 
        document.getElementById('txtFecha').value = today; 
        projectIdField.value = '';
        locationsList = []; 
        renderLocationsTable();
        
        newActivityContainer.classList.add('hidden'); 
        txtNewMunicipio.classList.add('hidden'); txtNewInstitucion.classList.add('hidden'); txtNewSede.classList.add('hidden');
        txtRp.classList.add('hidden'); txtSgp.classList.add('hidden'); txtMen.classList.add('hidden'); txtSgr.classList.add('hidden');
        lblTotal.textContent = '$0';
        clearLocationFields();
    }

    // --- NUEVO PROYECTO (CORREGIDO DEFINITIVO) ---
    if(btnNewProject) {
        btnNewProject.onclick = () => {
            resetForm(); 
            trackingForm.classList.remove('hidden');
            
            // 1. Desbloquear campos de Info Proyecto
            document.querySelectorAll('#projectInfoSection input').forEach(el => { 
                el.readOnly = false; 
                el.style.backgroundColor = '#fff'; 
            });
            
            // 2. Desbloquear Financieros
            [chkRp, chkSgp, chkMen, chkSgr].forEach(el => el.disabled = false);

            // 3. CORRECCIÓN RESPONSABLE: FUERZA BRUTA
            chkEditResp.checked = true;               // 1. Marcar checkbox visualmente
            
            txtResponsable.disabled = false;          // 2. Quitar atributo disabled del HTML
            txtResponsable.readOnly = false;          // 3. Quitar atributo readonly
            txtResponsable.classList.remove('input-readonly'); // 4. Quitar clase CSS gris
            txtResponsable.style.backgroundColor = '#ffffff';  // 5. Pintar fondo blanco
            txtResponsable.style.color = '#000000';            // 6. Pintar texto negro
            
            // 4. Poner foco en BPIN
            document.getElementById('txtBpin').focus();
        };
    }

    if(btnCancel) btnCancel.onclick = () => { resetForm(); trackingForm.classList.add('hidden'); };


    // --- SEARCH ---
    let debounce;
    const searchInput = document.getElementById('searchBpin');
    const resultsList = document.getElementById('searchResults');
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim(); clearTimeout(debounce);
        if(q.length < 3) { resultsList.classList.add('hidden'); return; }
        debounce = setTimeout(() => {
            fetch(`/api/search?q=${q}`).then(r=>r.json()).then(d => {
                resultsList.innerHTML = '';
                if(d.length){ d.forEach(p => { const li = document.createElement('li'); li.textContent = `${p.codigo_bpin} - ${p.nombre_proyecto}`; li.onclick = () => selectProject(p.codigo_bpin); resultsList.appendChild(li); }); resultsList.classList.remove('hidden'); } 
                else resultsList.classList.add('hidden');
            });
        }, 300);
    });

    function selectProject(bpin) {
        searchInput.value = ''; resultsList.classList.add('hidden');
        fetch(`/api/project/${bpin}`).then(r=>r.json()).then(d => {
            if(d.found) {
                resetForm(); trackingForm.classList.remove('hidden');
                const p = d.project;
                projectIdField.value = p.id;
                document.getElementById('txtBpin').value = p.codigo_bpin;
                document.getElementById('txtAnio').value = p.anio_contrato;
                document.getElementById('txtNombre').value = p.nombre_proyecto;
                document.getElementById('txtContratista').value = p.contratista;
                
                if(p.valor_rp) { chkRp.checked = true; txtRp.value = p.valor_rp; txtRp.classList.remove('hidden'); }
                if(p.valor_sgp) { chkSgp.checked = true; txtSgp.value = p.valor_sgp; txtSgp.classList.remove('hidden'); }
                if(p.valor_men) { chkMen.checked = true; txtMen.value = p.valor_men; txtMen.classList.remove('hidden'); }
                if(p.valor_sgr) { chkSgr.checked = true; txtSgr.value = p.valor_sgr; txtSgr.classList.remove('hidden'); }
                
                if(!p.valor_rp && !p.valor_sgp && !p.valor_men && !p.valor_sgr && p.valor_inicial > 0) {
                    txtValorTotalManual.value = p.valor_inicial;
                }
                calculateTotal();

                document.querySelectorAll('#projectInfoSection input').forEach(el => { el.readOnly = true; el.style.backgroundColor = '#e9ecef'; });
                [chkRp, chkSgp, chkMen, chkSgr].forEach(el => el.disabled = true);
                txtValorTotalManual.readOnly = true;

                selectActividad.innerHTML = '<option value="">-- SELECCIONE --</option>';
                d.activities.forEach(a => selectActividad.appendChild(new Option(a.descripcion, a.id)));
                selectActividad.appendChild(new Option('➕ NUEVA ACTIVIDAD...', 'new_activity'));
            }
        });
    }

    // --- HELPERS UBICACIÓN / ACTIVIDAD ---
    function handleNewInput(select, input, nextSelect, nextNewValue) {
        if (select.value.startsWith('new_')) {
            input.classList.remove('hidden'); input.required = true; input.focus();
            if (nextSelect) {
                nextSelect.innerHTML = `<option value="${nextNewValue}">➕ AGREGAR NUEVO...</option>`;
                nextSelect.value = nextNewValue; nextSelect.disabled = false; nextSelect.dispatchEvent(new Event('change'));
            }
        } else { input.classList.add('hidden'); input.required = false; }
    }
    
    selectMunicipio.addEventListener('change', () => { handleNewInput(selectMunicipio, txtNewMunicipio, selectInstitucion, 'new_institucion'); if (selectMunicipio.value && !selectMunicipio.value.startsWith('new_')) loadMunicipiosChildren(selectMunicipio.value, 'instituciones'); });
    selectInstitucion.addEventListener('change', () => { handleNewInput(selectInstitucion, txtNewInstitucion, selectSede, 'new_sede'); if (selectInstitucion.value && !selectInstitucion.value.startsWith('new_')) loadMunicipiosChildren(selectInstitucion.value, 'sedes'); });
    selectSede.addEventListener('change', () => handleNewInput(selectSede, txtNewSede, null, null));

    selectActividad.addEventListener('change', () => {
        const val = selectActividad.value;
        if (val === 'new_activity') {
            newActivityContainer.classList.remove('hidden'); txtNuevaActividad.required = true; txtNuevaActividad.focus();
        } else {
            newActivityContainer.classList.add('hidden'); txtNuevaActividad.required = false;
        }
    });

    function loadMunicipios() { fetch('/api/municipios').then(r=>r.json()).then(d=>populateSelect(selectMunicipio, d, 'new_municipio')); }
    function loadMunicipiosChildren(id, type) { 
        const url = type === 'instituciones' ? `/api/instituciones/${id}` : `/api/sedes/${id}`;
        const target = type === 'instituciones' ? selectInstitucion : selectSede;
        const nextNew = type === 'instituciones' ? 'new_institucion' : 'new_sede';
        fetch(url).then(r=>r.json()).then(d=> { populateSelect(target, d, nextNew); target.disabled = false; });
    }
    function loadIndicadores() { fetch('/api/indicadores').then(r=>r.json()).then(d=>populateSelect(selectIndicador, d)); }
    function populateSelect(el, items, newOptionValue) {
        el.innerHTML = '<option value="">-- SELECCIONE --</option>';
        items.forEach(i => el.appendChild(new Option(i.nombre, i.id)));
        if (newOptionValue) el.appendChild(new Option('➕ AGREGAR NUEVO...', newOptionValue));
    }
    
    function clearLocationFields() { selectMunicipio.value = ""; selectInstitucion.innerHTML = ""; selectInstitucion.disabled = true; selectSede.innerHTML = ""; selectSede.disabled = true; }
    const chkAdicion = document.getElementById('chkAdicion');
    const adicionFields = document.getElementById('adicionFields');
    chkAdicion.addEventListener('change', () => { if(chkAdicion.checked) adicionFields.classList.remove('hidden'); else adicionFields.classList.add('hidden'); });

    // Upload
    const modal = document.getElementById('uploadModal');
    const uStatus = document.getElementById('uploadStatus');
    document.getElementById('btnOpenUpload').onclick = () => { modal.classList.remove('hidden'); uStatus.innerHTML=''; };
    document.getElementsByClassName('close-modal')[0].onclick = () => modal.classList.add('hidden');
    document.getElementById('uploadForm').onsubmit = (e) => {
        e.preventDefault(); uStatus.innerHTML = 'Procesando...';
        fetch('/api/upload-excel', { method:'POST', body: new FormData(e.target) }).then(r=>r.json()).then(d => {
            if(d.success) { if(d.errors && d.errors.length) Swal.fire({ icon:'warning', title:'Advertencias', html: d.errors.join('<br>') }); else Swal.fire('Éxito', d.message, 'success'); modal.classList.add('hidden'); } else uStatus.innerHTML = d.error;
        });
    };
    document.getElementById('btnExport').onclick = () => window.location.href = '/api/export-excel';
});