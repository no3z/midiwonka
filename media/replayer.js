function Replayer(midiFile) {
    var trackStates = [];
    var beatsPerMinute = 120;
    var ticksPerBeat = midiFile.header.ticksPerBeat;
    var channelCount = 16;
    
    for (var i = 0; i < midiFile.tracks.length; i++) {
	trackStates[i] = {
	    'nextEventIndex': 0,
			'ticksToNextEvent': (
			    midiFile.tracks[i].length ?
				midiFile.tracks[i][0].deltaTime :
				null
			)
	};
	}
    
    function Channel() {
	var generatorsByNote = {};

	function noteOn(note, velocity) {
	    el = document.getElementById('lbl_left');
	//    el.innerHTML = ' </br> <span id="res" class="g">( NOTE ON ' +note+' v: '+velocity+')</span>';
	
	}
	function noteOff(note, velocity) {
	    el = document.getElementById('lbl_left');
//	    el.innerHTML = ' </br> <span id="res" class="g">( NOTE OFF ' +note+' v: '+velocity+')</span>';
	}
	function setProgram(programNumber) {
	    console.log(programNumber);
	}
	
	return {
	    'noteOn': noteOn,
	    'noteOff': noteOff,
	    'setProgram': setProgram
	}
    }
    
    var channels = [];
    for (var i = 0; i < channelCount; i++) {
	channels[i] = Channel();
    }
    
    var nextEventInfo;
    var samplesToNextEvent = 0;
    
    function getNextEvent() {
	var ticksToNextEvent = null;
	var nextEventTrack = null;
	var nextEventIndex = null;
	
	for (var i = 0; i < trackStates.length; i++) {
	    if (
		trackStates[i].ticksToNextEvent != null
		    && (ticksToNextEvent == null || trackStates[i].ticksToNextEvent < ticksToNextEvent)
	    ) {
		ticksToNextEvent = trackStates[i].ticksToNextEvent;
		nextEventTrack = i;
		nextEventIndex = trackStates[i].nextEventIndex;
	    }
	}
	if (nextEventTrack != null) {
	    /* consume event from that track */
	    var nextEvent = midiFile.tracks[nextEventTrack][nextEventIndex];
	    if (midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
		trackStates[nextEventTrack].ticksToNextEvent += midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
	    } else {
		trackStates[nextEventTrack].ticksToNextEvent = null;
	    }
	    trackStates[nextEventTrack].nextEventIndex += 1;
	    /* advance timings on all tracks by ticksToNextEvent */
	    for (var i = 0; i < trackStates.length; i++) {
		if (trackStates[i].ticksToNextEvent != null) {
		    trackStates[i].ticksToNextEvent -= ticksToNextEvent
		}
	    }
	    nextEventInfo = {
		'ticksToEvent': ticksToNextEvent,
		'event': nextEvent,
		'track': nextEventTrack
	    }
	    var beatsToNextEvent = ticksToNextEvent / ticksPerBeat;
	    var secondsToNextEvent = beatsToNextEvent / (beatsPerMinute / 60);
	    samplesToNextEvent += secondsToNextEvent * 44100; //synth.sampleRate;
	    console.log(samplesToNextEvent);
	} else {
	    nextEventInfo = null;
	    samplesToNextEvent = null;
	    self.finished = true;
	}
	el = document.getElementById('lbl_left');
//	el.innerHTML = ' </br> <span id="res" class="g">( ' +nextEventInfo+' v: '+secondsToNextEvent+')</span>';
    }
    
    getNextEvent();
    

    function generate() {
	var samples = 44100;
	var data = new Array(samples*2);
	var samplesRemaining = samples;
	var dataOffset = 0;
	el = document.getElementById('lbl_left');
	el.innerHTML = ' </br> <span id="res" class="g">( ' +samplesToNextEvent+' v: '+samplesRemaining+')</span>';

	while (true) {
	    if (samplesToNextEvent != null && samplesToNextEvent <= samplesRemaining) {

		var samplesToGenerate = Math.ceil(samplesToNextEvent);
		if (samplesToGenerate > 0) {
		    dataOffset += samplesToGenerate * 2;
		    samplesRemaining -= samplesToGenerate;
		    samplesToNextEvent -= samplesToGenerate;
		}
		
		handleEvent();
		getNextEvent();
	    } else {
		/* generate samples to end of buffer */
		if (samplesRemaining > 0) {
		    samplesToNextEvent -= samplesRemaining;
		}
		break;
	    }
	}
	return data;
    }


      
    function handleEvent() {
	var event = nextEventInfo.event;
	switch (event.type) {
	case 'meta':
	    switch (event.subtype) {
	    case 'setTempo':
		beatsPerMinute = 60000000 / event.microsecondsPerBeat
	    }
	    break;
	case 'channel':
	    switch (event.subtype) {
	    case 'noteOn':
		channels[event.channel].noteOn(event.noteNumber, event.velocity);
		break;
	    case 'noteOff':
		channels[event.channel].noteOff(event.noteNumber, event.velocity);
		break;
	    case 'programChange':
		channels[event.channel].setProgram(event.programNumber);
		break;
	    }
	    break;
	}
    }
    
    function replay(audio) {
	audio.write(generate(44100));
	setTimeout(function() {replay(audio)}, 10);
    }
    
    var self = {
	'replay': replay,
	'generate': generate,
	'finished': false
    }
    return self;
}
    