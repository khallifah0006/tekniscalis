document.addEventListener('DOMContentLoaded', function() {
  const healthInfoSection = document.getElementById('healthInfoSection');
  const calculatorSection = document.getElementById('calculatorSection');
  const resultsSection = document.getElementById('resultsSection');
  const myProgramSection = document.getElementById('myProgramSection');
  const testimonialSection = document.getElementById('testimonialSection');
  const startTestBtn = document.getElementById('startTestBtn');
  const backToHealthBtn = document.getElementById('backToHealthBtn');
  const backToCalculatorBtn = document.getElementById('backToCalculatorBtn');
  const viewProgramBtn = document.getElementById('viewProgramBtn');
  const viewTestimonialsBtn = document.getElementById('viewTestimonialsBtn');
  const backToProgramBtn = document.getElementById('backToProgramBtn');
  const backTomainmenu = document.getElementById('backTomainmenu');
  const workoutForm = document.getElementById('workoutForm');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const recommendBtn = document.getElementById('recommendBtn');
  const recommendationsDiv = document.getElementById('recommendations');
  const workoutTypeSelect = document.getElementById('workoutType');
  const difficultyLevelSelect = document.getElementById('difficultyLevel');
  const selectedWorkoutsDiv = document.getElementById('selectedWorkouts');
  const editBtn = document.getElementById('editBtn');
  const updateBtn = document.getElementById('updateBtn');
  const saveBtn = document.getElementById('saveBtn');
  const programStatusDiv = document.createElement('div');
  programStatusDiv.id = 'programStatus';
  programStatusDiv.className = 'program-status';
  myProgramSection.querySelector('.container').insertBefore(
    programStatusDiv, 
    myProgramSection.querySelector('.container').firstChild.nextSibling
  );
  let isEditMode = false;
  let currentProgramId = null;
  let selectedWorkouts = [];
  let currentRecommendations = [];
  initializeApp();
  async function initializeApp() {
    try {
      const response = await fetch('/api/programs');
      if (response.ok) {
        const programs = await response.json();
        
        if (programs.length > 0) {
          const latestProgram = programs.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          )[0];
          
          currentProgramId = latestProgram.id;
          selectedWorkouts = latestProgram.workouts;
          updateSelectedWorkoutsView();
          updateViewProgramButton();
          showNotification('Program latihan terakhir berhasil dimuat!', 'success');
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  }
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  editBtn.addEventListener('click', function() {
    isEditMode = true;
    selectedWorkoutsDiv.classList.add('edit-mode');
    editBtn.classList.add('hidden');
    updateBtn.classList.remove('hidden');
    updateSelectedWorkoutsView();
  });
  
  updateBtn.addEventListener('click', async function() {
    isEditMode = false;
    selectedWorkoutsDiv.classList.remove('edit-mode');
    updateBtn.classList.add('hidden');
    editBtn.classList.remove('hidden');
    programStatusDiv.innerHTML = '';
    if (currentProgramId && selectedWorkouts.length > 0) {
      try {
        const response = await fetch(`/api/programs/${currentProgramId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            program: selectedWorkouts
          }),
        });
        
        if (response.ok) {
          showNotification('Program berhasil diperbarui!', 'success');
        } else {
          throw new Error('Failed to update program');
        }
      } catch (error) {
        console.error('Error updating program:', error);
        showNotification('Gagal memperbarui program.', 'error');
      }
    }
    
    // Update view without edit controls
    updateSelectedWorkoutsView();
  });
  
  // Event listener for "Save as PDF" button
  saveBtn.addEventListener('click', async function() {
    if (selectedWorkouts.length === 0) {
      showNotification('Tidak ada program untuk disimpan. Tambahkan gerakan terlebih dahulu.', 'error');
      return;
    }
    
    try {
      // If we're updating an existing program
      if (currentProgramId) {
        const response = await fetch(`/api/programs/${currentProgramId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            program: selectedWorkouts
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update program');
        }
        
        showNotification('Program berhasil diperbarui!', 'success');
      } else {
        // Save program to the server as a new program
        const response = await fetch('/api/programs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            program: selectedWorkouts,
            created_at: new Date().toISOString()
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save program');
        }
        
        const result = await response.json();
        currentProgramId = result.id;
        
        showNotification('Program berhasil disimpan!', 'success');
      }
      
      // Generate PDF on client side
      generatePDF(selectedWorkouts);
    } catch (error) {
      console.error('Error saving program:', error);
      showNotification('Terjadi kesalahan saat menyimpan program.', 'error');
    }
  });
  
  // Function to generate PDF with improved approach
  function generatePDF(workouts) {
    // Create printable content in a new window
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      showNotification('Popup blocked. Mohon izinkan popup untuk mengunduh PDF.', 'error');
      return;
    }
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Program Latihan Saya</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #3498db; }
          .workout { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
          .workout-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .workout-detail { margin: 5px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #7f8c8d; }
          
          .difficulty-easy { color: #27ae60; }
          .difficulty-medium { color: #f39c12; }
          .difficulty-hard { color: #e74c3c; }
          
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none; }
          }
          .print-instructions {
            background-color: #f8f9fa;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .print-button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="print-instructions no-print">
          <h2>Panduan Menyimpan PDF</h2>
          <p>1. Klik tombol "Print / Cetak" di bawah</p>
          <p>2. Pada dialog cetak, pilih "Save as PDF" atau "Simpan sebagai PDF" sebagai printer</p>
          <p>3. Klik "Save" atau "Simpan"</p>
          <button class="print-button" onclick="window.print(); return false;">Print / Cetak</button>
        </div>

        <h1>Program Latihan Saya</h1>
        <p>Tanggal: ${new Date().toLocaleDateString()}</p>
    `;
    
    workouts.forEach((workout, index) => {
      // Determine difficulty class
      let difficultyClass = '';
      if (workout.kesulitan === 'Easy') difficultyClass = 'difficulty-easy';
      else if (workout.kesulitan === 'Medium') difficultyClass = 'difficulty-medium';
      else if (workout.kesulitan === 'Hard' || workout.kesulitan === 'Very Hard') difficultyClass = 'difficulty-hard';
      
      content += `
        <div class="workout">
          <div class="workout-name">${index + 1}. ${workout.name}</div>
          <div class="workout-detail"><strong>Jenis:</strong> ${workout.jenis}</div>
          <div class="workout-detail"><strong>Target:</strong> ${workout.target}</div>
          <div class="workout-detail"><strong>Kesulitan:</strong> <span class="${difficultyClass}">${workout.kesulitan}</span></div>
          <div class="workout-detail"><strong>Deskripsi:</strong> ${workout.description}</div>
        </div>
      `;
    });
    
    content += `
        <div class="footer">
          <p>Dibuat oleh Sistem Rekomendasi Workout</p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Let user know the PDF has been generated
    showNotification('Program berhasil disimpan! Silakan gunakan tombol "Print / Cetak" untuk menyimpan sebagai PDF.', 'success');
  }

  // Function to show a specific slide and hide others
  function showSlide(slideToShow) {
    // Hide all slides
    healthInfoSection.classList.add('hidden');
    calculatorSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    myProgramSection.classList.add('hidden');
    testimonialSection.classList.add('hidden');
    
    // Show the requested slide
    slideToShow.classList.remove('hidden');
  }
  
  // Event listener for "Ikuti Test" button
  startTestBtn.addEventListener('click', function() {
    showSlide(calculatorSection);
  });
  
  // Event listener for back button to health info
  backToHealthBtn.addEventListener('click', function() {
    showSlide(healthInfoSection);
  });
  
  // Event listener for back button to calculator
  backToCalculatorBtn.addEventListener('click', function() {
    showSlide(calculatorSection);
  });
  
  // Event listener for "View Testimonials" button
  viewTestimonialsBtn.addEventListener('click', function() {
    showSlide(testimonialSection);
  });
  
  // Event listener for back button to program
  backToProgramBtn.addEventListener('click', function() {
    showSlide(myProgramSection);
  });

  backTomainmenu.addEventListener('click', function() {
    showSlide(myProgramSection);
  });

  workoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const age = document.getElementById('age').value;
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;
    
    // Basic validation
    if (!age || !height || !weight) {
      showNotification('Silakan isi semua field.', 'error');
      return;
    }
    
    // Show loading, hide form
    workoutForm.closest('.form-container').classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    
    // Send data to server
    fetchRecommendations(age, height, weight);
  });
  
  async function fetchRecommendations(age, height, weight) {
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          age: parseFloat(age),
          height: parseFloat(height),
          weight: parseFloat(weight)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      displayResults(data);
      
      // Show results section after successful fetch
      showSlide(resultsSection);
      
    } catch (error) {
      console.error('Error:', error);
      showNotification('Terjadi kesalahan saat mengambil rekomendasi. Silakan coba lagi.', 'error');
      
      // Show form again
      workoutForm.closest('.form-container').classList.remove('hidden');
      loadingDiv.classList.add('hidden');
    }
  }
  function displayResults(data) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    document.getElementById('bmi-value').textContent = data.bmi.toFixed(2);
    document.getElementById('bmi-category').textContent = data.bmi_category;
    document.getElementById('age-category').textContent = data.age_category;
    document.getElementById('difficulty-level').textContent = data.difficulty_level;
    const workoutSummary = document.getElementById('workout-summary');
    workoutSummary.innerHTML = data.summary;
    const enduranceWorkouts = document.getElementById('endurance-workouts');
    enduranceWorkouts.innerHTML = '';
    data.endurance_workouts.forEach((workout, index) => {
      const workoutCard = createWorkoutCard(workout, index + 1);
      enduranceWorkouts.appendChild(workoutCard);
    });
    const strengthWorkouts = document.getElementById('strength-workouts');
    strengthWorkouts.innerHTML = '';
    
    data.strength_workouts.forEach((workout, index) => {
      const workoutCard = createWorkoutCard(workout, index + 1);
      strengthWorkouts.appendChild(workoutCard);
    });
  }
  
  function createWorkoutCard(workout, index) {
    const card = document.createElement('div');
    card.className = 'workout-card';
    
    card.innerHTML = `
      <div class="workout-title">${index}. ${workout.name}</div>
      <div class="workout-detail">
        <span class="label">Kesulitan:</span>
        <span class="value ${workout.kesulitan}">${workout.kesulitan}</span>
      </div>
      <div class="workout-detail">
        <span class="label">Target:</span>
        <span class="value">${workout.target}</span>
      </div>
      <div class="workout-detail">
        <span class="label">Deskripsi:</span>
        <span class="value">${workout.description}</span>
      </div>
    `;
    
    return card;
  }
  function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
  }
  function updateSelectedWorkoutsView() {
    if (selectedWorkouts.length === 0) {
      selectedWorkoutsDiv.innerHTML = '<p class="empty-message">Belum ada gerakan yang dipilih. Tambahkan gerakan dengan klik tombol (+).</p>';
      return;
    }
    
    let html = '';
    selectedWorkouts.forEach((workout, index) => {
      let difficultyClass = '';
      if (workout.kesulitan === 'Easy') difficultyClass = 'difficulty-easy';
      else if (workout.kesulitan === 'Medium') difficultyClass = 'difficulty-medium';
      else if (workout.kesulitan === 'Hard' || workout.kesulitan === 'Very Hard') difficultyClass = 'difficulty-hard';
      
      html += `
        <div class="workout-card selected-workout" data-index="${index}">
          <div class="workout-name">${workout.name}</div>
          <div class="workout-detail"><strong>Jenis:</strong> ${workout.jenis}</div>
          <div class="workout-detail"><strong>Subkategori:</strong> ${workout.subkategori || 'N/A'}</div>
          <div class="workout-detail"><strong>Target:</strong> ${workout.target}</div>
          <div class="workout-detail"><strong>Kesulitan:</strong> <span class="${difficultyClass}">${workout.kesulitan}</span></div>
          <div class="workout-detail"><strong>Deskripsi:</strong> ${workout.description}</div>
          <div class="workout-actions">
            ${isEditMode ? `
              <span class="action-btn edit-btn" title="Edit gerakan" data-index="${index}">⚙️</span>
              <span class="action-btn remove-btn" title="Hapus dari program" data-index="${index}">🗑️</span>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    selectedWorkoutsDiv.innerHTML = html;
    if (isEditMode) {
      document.querySelectorAll('.selected-workout .edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          openEditForm(index);
        });
      });
      
      document.querySelectorAll('.selected-workout .remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const index = parseInt(this.getAttribute('data-index'));
          deleteWorkout(index);
        });
      });
    }
  }
  function openEditForm(index) {
    sessionStorage.setItem('editingWorkoutIndex', index);
    const notificationDiv = document.createElement('div');
    notificationDiv.id = 'edit-notification';
    notificationDiv.className = 'edit-notification';
    notificationDiv.innerHTML = `<p>Silakan pilih workout baru untuk menggantikan "${selectedWorkouts[index].name}"</p>`;
    notificationDiv.style.backgroundColor = '#fff3cd';
    notificationDiv.style.color = '#856404';
    notificationDiv.style.padding = '10px';
    notificationDiv.style.borderRadius = '5px';
    notificationDiv.style.marginBottom = '15px';
    notificationDiv.style.textAlign = 'center';
    notificationDiv.style.fontWeight = 'bold';
    showSlide(resultsSection);
    const resultsContainer = document.querySelector('#results');
    resultsContainer.insertBefore(notificationDiv, resultsContainer.firstChild);
    document.getElementById('recommendBtn').scrollIntoView({ behavior: 'smooth' });
    triggerRecommendationForEdit();
  }
  function triggerRecommendationForEdit() {
    recommendBtn.click();
    const observer = new MutationObserver((mutations) => {
      if (recommendationsDiv.querySelector('.workout-card')) {
        observer.disconnect();
        updateAddButtonsForEdit();
      }
    });
    observer.observe(recommendationsDiv, { childList: true, subtree: true });
  }
  function updateAddButtonsForEdit() {
    document.querySelectorAll('.workout-card .action-btn').forEach(btn => {
      if (btn.classList.contains('add-btn')) {
        btn.textContent = '↺';
        btn.title = 'Ganti dengan workout ini';
        btn.classList.add('replace-btn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add new click handler
        newBtn.addEventListener('click', function() {
          const workoutCard = this.closest('.workout-card');
          const workoutName = workoutCard.getAttribute('data-name');
          const workout = currentRecommendations.find(w => w.name === workoutName);
          if (!workout) return;
          const editIndex = parseInt(sessionStorage.getItem('editingWorkoutIndex'));
          if (!isNaN(editIndex) && editIndex >= 0 && editIndex < selectedWorkouts.length) {
            selectedWorkouts[editIndex] = workout;
            showNotification(`Gerakan berhasil diganti dengan "${workout.name}"`, 'success');
            showSlide(myProgramSection);
            sessionStorage.removeItem('editingWorkoutIndex');
            document.getElementById('edit-notification')?.remove();
            updateSelectedWorkoutsView();
          }
        });
      }
    });
  }
  async function deleteWorkout(index) {
    if (confirm('Apakah Anda yakin ingin menghapus gerakan ini dari program?')) {
      const workout = selectedWorkouts[index];
      try {
        if (workout.id) {
          const response = await fetch(`/api/workouts/${workout.id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete workout from server');
          }
        }
        selectedWorkouts.splice(index, 1);
        updateSelectedWorkoutsView();
        updateViewProgramButton();
        showNotification('Gerakan berhasil dihapus dari program.', 'success');
      } catch (error) {
        console.error('Error deleting workout:', error);
        showNotification('Terjadi kesalahan saat menghapus workout.', 'error');
      }
    }
  }
  function updateViewProgramButton() {
    if (selectedWorkouts.length > 0) {
      viewProgramBtn.style.display = 'block';
    } else {
      viewProgramBtn.style.display = 'none';
    }
  }
  function addWorkoutToProgram(workoutCard, workout) {
    const exists = selectedWorkouts.some(w => w.name === workout.name);
    if (exists) {
      showNotification('Gerakan ini sudah ada dalam program Anda.', 'info');
      return;
    }
    selectedWorkouts.push(workout);
    updateSelectedWorkoutsView();
    updateViewProgramButton();
    const actionBtn = workoutCard.querySelector('.action-btn');
    actionBtn.className = 'action-btn remove-btn';
    actionBtn.textContent = '-';
    actionBtn.title = 'Hapus dari program';
    
    showNotification(`"${workout.name}" berhasil ditambahkan ke program.`, 'success');
  }
  function removeWorkoutFromProgram(workoutCard, workoutName) {
    const index = selectedWorkouts.findIndex(w => w.name === workoutName);
    if (index !== -1) {
      selectedWorkouts.splice(index, 1);
      updateSelectedWorkoutsView();
      updateViewProgramButton();
      const actionBtn = workoutCard.querySelector('.action-btn');
      actionBtn.className = 'action-btn add-btn';
      actionBtn.textContent = '+';
      actionBtn.title = 'Tambahkan ke program';
      showNotification(`"${workoutName}" berhasil dihapus dari program.`, 'info');
    }
  }
  recommendBtn.addEventListener('click', async function() {
    const workoutType = workoutTypeSelect.value;
    const difficultyLevel = difficultyLevelSelect.value;
    try {
      const response = await fetch('/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workoutType, difficultyLevel }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        recommendationsDiv.innerHTML = `<p>Error: ${data.error}</p>`;
        return;
      }
      
      if (!data.recommendations || data.recommendations.length === 0) {
        recommendationsDiv.innerHTML = '<p>Tidak ada rekomendasi yang ditemukan.</p>';
        return;
      }
      currentRecommendations = data.recommendations;
      let html = '<h2>List Gerakan:</h2>';
      data.recommendations.forEach(workout => {
        let difficultyClass = '';
        if (workout.kesulitan === 'Easy') difficultyClass = 'difficulty-easy';
        else if (workout.kesulitan === 'Medium') difficultyClass = 'difficulty-medium';
        else if (workout.kesulitan === 'Hard' || workout.kesulitan === 'Very Hard') difficultyClass = 'difficulty-hard';
        const isSelected = selectedWorkouts.some(selected => selected.name === workout.name);
        html += `
          <div class="workout-card" data-name="${workout.name}">
            <div class="workout-name">${workout.name}</div>
            <div class="workout-detail"><strong>Jenis:</strong> ${workout.jenis}</div>
            <div class="workout-detail"><strong>Subkategori:</strong> ${workout.subkategori || 'N/A'}</div>
            <div class="workout-detail"><strong>Target:</strong> ${workout.target}</div>
            <div class="workout-detail"><strong>Kesulitan:</strong> <span class="${difficultyClass}">${workout.kesulitan}</span></div>
            <div class="workout-detail"><strong>Deskripsi:</strong> ${workout.description}</div>
            <div class="workout-actions">
              <span class="action-btn ${isSelected ? 'remove-btn' : 'add-btn'}" title="${isSelected ? 'Hapus dari program' : 'Tambahkan ke program'}">${isSelected ? '-' : '+'}</span>
            </div>
          </div>
        `;
      });
      recommendationsDiv.innerHTML = html;
      document.querySelectorAll('.workout-card .action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const workoutCard = this.closest('.workout-card');
          const workoutName = workoutCard.getAttribute('data-name');
          const workout = data.recommendations.find(w => w.name === workoutName);
          if (!workout) return;
          if (this.classList.contains('add-btn')) {
            addWorkoutToProgram(workoutCard, workout);
            this.classList.remove('add-btn');
            this.classList.add('remove-btn');
            this.textContent = '-';
            this.title = 'Hapus dari program';
          } else {
            removeWorkoutFromProgram(workoutCard, workoutName);
            this.classList.remove('remove-btn');
            this.classList.add('add-btn');
            this.textContent = '+';
            this.title = 'Tambahkan ke program';
          }
        });
      });

      if (document.getElementById('edit-notification')) {
        updateAddButtonsForEdit();
      }
      
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      recommendationsDiv.innerHTML = '<p>Terjadi kesalahan saat mengambil rekomendasi.</p>';
    }
  });

  viewProgramBtn.addEventListener('click', function() {
    showSlide(myProgramSection);
    updateSelectedWorkoutsView();
  });
});