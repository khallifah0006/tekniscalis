const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const bodyParser = require('body-parser');
const workouts = require('./workouts');
const app = express();
const PORT = 8080;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage instead of file-based storage
const inMemoryStorage = {
  programs: []
};

// Helper functions to simulate localStorage-like behavior
function readPrograms() {
  return inMemoryStorage.programs;
}

function writePrograms(programs) {
  inMemoryStorage.programs = programs;
  return true;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Error response helper
function errorResponse(res, status, message) {
  return res.status(status).json({ 
    success: false, 
    error: message 
  });
}

// GET all programs
app.get('/api/programs', (req, res) => {
  try {
    const programs = readPrograms();
    res.json(programs);
  } catch (error) {
    console.error('Error getting programs:', error);
    return errorResponse(res, 500, 'Failed to get programs');
  }
});

// GET program by ID
app.get('/api/programs/:id', (req, res) => {
  try {
    const programs = readPrograms();
    const program = programs.find(p => p.id === req.params.id);
    
    if (!program) {
      return errorResponse(res, 404, 'Program not found');
    }
    
    res.json(program);
  } catch (error) {
    console.error('Error getting program:', error);
    return errorResponse(res, 500, 'Failed to get program');
  }
});

// CREATE a new program
app.post('/api/programs', (req, res) => {
  try {
    const { program, created_at } = req.body;
    
    if (!program || !Array.isArray(program) || program.length === 0) {
      return errorResponse(res, 400, 'Invalid program data');
    }
    
    const programs = readPrograms();
    
    // Create new program with ID
    const newProgram = {
      id: generateId(),
      workouts: program,
      created_at: created_at || new Date().toISOString()
    };
    
    programs.push(newProgram);
    
    // Save to in-memory storage
    if (writePrograms(programs)) {
      res.status(201).json({ success: true, id: newProgram.id });
    } else {
      return errorResponse(res, 500, 'Failed to save program');
    }
  } catch (error) {
    console.error('Error creating program:', error);
    return errorResponse(res, 500, 'Failed to create program');
  }
});

// UPDATE a program
app.put('/api/programs/:id', (req, res) => {
  try {
    const { program } = req.body;
    const programId = req.params.id;
    
    if (!program || !Array.isArray(program)) {
      return errorResponse(res, 400, 'Invalid program data');
    }
    
    const programs = readPrograms();
    const programIndex = programs.findIndex(p => p.id === programId);
    
    if (programIndex === -1) {
      return errorResponse(res, 404, 'Program not found');
    }
    
    // Update program
    programs[programIndex].workouts = program;
    programs[programIndex].updated_at = new Date().toISOString();
    
    // Save to in-memory storage
    if (writePrograms(programs)) {
      res.json({ success: true });
    } else {
      return errorResponse(res, 500, 'Failed to update program');
    }
  } catch (error) {
    console.error('Error updating program:', error);
    return errorResponse(res, 500, 'Failed to update program');
  }
});

// DELETE a program
app.delete('/api/programs/:id', (req, res) => {
  try {
    const programId = req.params.id;
    const programs = readPrograms();
    const filteredPrograms = programs.filter(p => p.id !== programId);
    
    if (programs.length === filteredPrograms.length) {
      return errorResponse(res, 404, 'Program not found');
    }
    
    // Save to in-memory storage
    if (writePrograms(filteredPrograms)) {
      res.json({ success: true });
    } else {
      return errorResponse(res, 500, 'Failed to delete program');
    }
  } catch (error) {
    console.error('Error deleting program:', error);
    return errorResponse(res, 500, 'Failed to delete program');
  }
});

// DELETE a workout from a program
app.delete('/api/workouts/:id', (req, res) => {
  try {
    const workoutId = req.params.id;
    const programs = readPrograms();
    
    // Find the program containing the workout
    let workoutFound = false;
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const workoutIndex = program.workouts.findIndex(w => w.id === workoutId);
      
      if (workoutIndex !== -1) {
        // Remove the workout
        program.workouts.splice(workoutIndex, 1);
        workoutFound = true;
        break;
      }
    }
    
    if (!workoutFound) {
      return errorResponse(res, 404, 'Workout not found');
    }
    
    // Save updated programs
    if (writePrograms(programs)) {
      res.json({ success: true });
    } else {
      return errorResponse(res, 500, 'Failed to delete workout');
    }
  } catch (error) {
    console.error('Error deleting workout:', error);
    return errorResponse(res, 500, 'Failed to delete workout');
  }
});

// Standardized workout recommendation endpoint
app.post('/api/recommend', (req, res) => {
  try {
    const { workoutType, difficultyLevel } = req.body;
    
    // Validate input
    if (!workoutType) {
      return errorResponse(res, 400, 'Workout type is required');
    }
    
    // If selecting "all" workout types
    if (workoutType === 'semua') {
      // Combine all exercises from all categories
      let allWorkouts = [];
      for (const type in workouts) {
        for (const sub in workouts[type]) {
          allWorkouts = [...allWorkouts, ...workouts[type][sub]];
        }
      }
      
      // Filter based on difficulty if specified
      if (difficultyLevel && difficultyLevel !== 'all') {
        const difficultyMap = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        allWorkouts = allWorkouts.filter(w => w.kesulitan === difficultyMap[difficultyLevel]);
      }
      
      return res.json({ success: true, recommendations: allWorkouts });
    } else if (workouts[workoutType]) {
      // If selecting a specific type (strength or endurance)
      // Combine all exercises from the selected type
      let typeWorkouts = [];
      for (const sub in workouts[workoutType]) {
        typeWorkouts = [...typeWorkouts, ...workouts[workoutType][sub]];
      }
      
      // Filter based on difficulty if specified
      if (difficultyLevel && difficultyLevel !== 'all') {
        const difficultyMap = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        typeWorkouts = typeWorkouts.filter(w => w.kesulitan === difficultyMap[difficultyLevel]);
      }
      
      return res.json({ success: true, recommendations: typeWorkouts });
    } else {
      // If type not found
      return errorResponse(res, 400, 'Invalid workout type');
    }
  } catch (error) {
    console.error('Error in recommend endpoint:', error);
    return errorResponse(res, 500, 'Server error while processing recommendation');
  }
});

// Keeping the old endpoint for backward compatibility
app.post('/recommend', (req, res) => {
  // Simply forward to the new standardized endpoint
  req.url = '/api/recommend';
  app._router.handle(req, res);
});

app.post('/api/recommendations', (req, res) => {
  const { age, height, weight } = req.body;
  
  if (!age || !height || !weight) {
    return errorResponse(res, 400, 'Missing required fields');
  }
  
  // Run Python script with input values
  const pythonProcess = spawn('python', [
    'workout_recommendation.py',
    '--age', age.toString(),
    '--height', height.toString(),
    '--weight', weight.toString()
  ]);
  
  let dataString = '';
  
  // Collect data from script
  pythonProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });
  
  // Handle errors
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python script error: ${data}`);
  });
  
  // Send response when script finishes
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return errorResponse(res, 500, 'Python script execution failed');
    }
    
    try {
      const results = JSON.parse(dataString);
      res.send(results);
    } catch (error) {
      console.error('Error parsing Python output:', error);
      return errorResponse(res, 500, 'Failed to parse Python output');
    }
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Using in-memory storage for programs (data will be lost on server restart)');
});