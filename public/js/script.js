try {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
} catch (e) {
    console.error(e);
    $('.no-browser-support').show();
    $('.app').hide();
}

var noteTextarea = $('#note-textarea');
var instructions = $('#recording-instructions');
var notesList = $('ul#notes');
//add output text
var outputText = $('#output-textarea')

var noteContent = '';

// Get all notes from previous sessions and display them.
var notes = getAllNotes();
renderNotes(notes);

/*-----------------------------
      Voice Recognition
------------------------------*/

// If false, the recording will stop after a few seconds of silence.
// When true, the silence period is longer (about 15 seconds),
// allowing us to keep recording even when the user pauses.
recognition.continuous = true;

// This block is called every time the Speech APi captures a line.
recognition.onresult = function(event) {

    // event is a SpeechRecognitionEvent object.
    // It holds all the lines we have captured so far.
    // We only need the current one.
    var current = event.resultIndex;

    // Get a transcript of what was said.
    var transcript = event.results[current][0].transcript;

    // Add the current transcript to the contents of our Note.
    // There is a weird bug on mobile, where everything is repeated twice.
    // There is no official solution so far so we have to handle an edge case.
    var mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);

    if (!mobileRepeatBug) {
        noteContent += transcript;
        noteTextarea.val(noteContent);
    }
};

recognition.onstart = function() {
    instructions.text('Voice recognition activated. Try speaking into the microphone.');
}

recognition.onspeechend = function() {
    instructions.text('You were quiet for a while so voice recognition turned itself off.');
}

recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
        instructions.text('No speech was detected. Try again.');
    };
}



/*-----------------------------
      App buttons and input
------------------------------*/

$('#start-record-btn').on('click', function(e) {
    if (noteContent.length) {
        noteContent += ' ';
    }
    recognition.start();
});


$('#pause-record-btn').on('click', function(e) {
    recognition.stop();
    instructions.text('Voice recognition paused.');
});

// Sync the text inside the text area with the noteContent variable.
noteTextarea.on('input', function() {
    noteContent = $(this).val();
});

$('#save-note-btn').on('click', function(e) {
    recognition.stop();

    if (!noteContent.length) {
        instructions.text('Could not save empty note. Please add a message to your note.');
    } else {
        // Save note to localStorage.
        // The key is the dateTime with seconds, the value is the content of the note.
        saveNote(new Date().toLocaleString(), noteContent);
        // Reset variables and update UI.
        noteContent = '';
        renderNotes(getAllNotes());
        noteTextarea.val('');
        instructions.text('Note saved successfully.');
    }
})

//Start the Google api
$('#analysis-note-btn').on('click', function(e) {
    console.log("analysis button clicked.")
    instructions.text('Start analyse ......');
    var input =  noteContent.value;
    //var input = "today is monday in NYC. have a nice day. remember out date at 8 pm. I will call Donald Trump at 10.";
    console.log(input);
    //call goolge entites api
    var url = '/nlp';
    var data = {text: input};
    var entity = $.ajax({
      type: 'POST',
      data: JSON.stringify(data),
      contentType: 'application/json',
      url: url,						
      success: function(response) {
        console.log('success');
        //console.log(JSON.stringify(response));
        res = response;
        }
      });
    //
    entity.done(function(){
      console.log("NLP job complete.");
      //return a list of word
      console.log(res);
      console.log(res['entities']);
      console.log(typeof res);
      output = colorText(res);
      console.log(output);
      outputText.text(output);
    });
})

notesList.on('click', function(e) {
    e.preventDefault();
    var target = $(e.target);
    // Listen to the selected note.
    if (target.hasClass('listen-note')) {
        var content = target.closest('.note').find('.content').text();
        readOutLoud(content);
    }

    // Delete note.
    if (target.hasClass('delete-note')) {
        var dateTime = target.siblings('.date').text();
        deleteNote(dateTime);
        target.closest('.note').remove();
    }
});

/*-----------------------------
      Speech Synthesis
------------------------------*/

function readOutLoud(message) {
    var speech = new SpeechSynthesisUtterance();

    // Set the text and voice attributes.
    speech.text = message;
    speech.volume = 1;
    speech.rate = 1;
    speech.pitch = 3;

    window.speechSynthesis.speak(speech);
}

/*-----------------------------
      Helper Functions
------------------------------*/

function renderNotes(notes) {
    var html = '';
    if (notes.length) {
        notes.forEach(function(note) {
            html += `
      <!--Hide for now
        <li class="note">
        <p class="header">
          <span class="date">${note.date}</span>
          <a href="#" class="listen-note" title="Listen to Note">Listen to Note</a>
          <a href="#" class="delete-note" title="Delete">Delete</a>
        </p>
      </li>
      -->`;
        });
    } else {
        html = '<li><p class="content">You don\'t have any notes yet.</p></li>';
    }
    notesList.html(html);
}


function saveNote(dateTime, content) {
    localStorage.setItem('note-' + dateTime, content);
}

function colorText(response){
  coloredText = []
  entites_arr = response['entities']
  $.each(entites_arr, function( index, value ) {
    //value is a dictionary
    word = value['name']
    //the color of word is by types
    coloredText.push(word)
    return coloredText

});

  return coloredText
}

function getAllNotes() {
    var notes = [];
    var key;
    for (var i = 0; i < localStorage.length; i++) {
        key = localStorage.key(i);

        if (key.substring(0, 5) == 'note-') {
            notes.push({
                date: key.replace('note-', ''),
                content: localStorage.getItem(localStorage.key(i))
            });
        }
    }
    return notes;
}


function deleteNote(dateTime) {
    localStorage.removeItem('note-' + dateTime);
}
