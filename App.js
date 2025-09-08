import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Image
} from "react-native";
import { Video } from "expo-av";
import Slider from "@react-native-community/slider";
import moment from "moment";
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});

  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);

  const [editMode, setEditMode] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState([]);

  const [color, setColor] = useState('red');
  const [showColors, setShowColors] = useState(false);

  const colors = ['red', 'blue', 'green', 'orange', 'purple', 'black'];

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('COMMENTS_STORE');
        if (saved) {
          setComments(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Could not load comments', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('COMMENTS_STORE',
          comments.map(c => ({
            ...c,
            drawing: Array.isArray(c.drawing) ? c.drawing : null
          }))
        );
      } catch (e) {
        console.warn('Could not save comments', e);
      }
    })();
  }, [comments]);

  const onPressPlayPause = async () => {
    if (!status.isLoaded) return;
    if (status.positionMillis >= status.durationMillis) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      return;
    }
    status.isPlaying
      ? await videoRef.current.pauseAsync()
      : await videoRef.current.playAsync();
  };

  const onPressAudio = async () => {
    if (!status.isLoaded) return;
    await videoRef.current.setIsMutedAsync(!status.isMuted);
  };

  const onControlTiming = async (value) => {
    console.log(value * status.durationMillis)
    if (!status.isLoaded) return;
    await videoRef.current.setPositionAsync(value * status.durationMillis);
  };

  const onPressFullScreen = async () => {
    if (!videoRef.current) return;
    await videoRef.current.presentFullscreenPlayer();
  }

  const format = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const addComment = async () => {
    if (!comment.trim()) {
      Alert.alert('Alert', 'Please write something before adding a comment.');
      return;
    }
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: comment,
        createdAt: new Date(),
        user: {
          name: "User Name",
          profileImage:
            "https://cdn.pixabay.com/photo/2014/03/25/16/32/user-297330_1280.png",
        },
        videoTime: formatVideoTime(current),
        seekTime: current,
        drawing: paths.length > 0 && editMode ? paths : null,
      },
    ]);
    setComment("");
    setPaths([]);
    setEditMode(false);
    console.log(comments);
  };

  const formatDate = (date) => {
    const m = moment(date);
    if (m.isSame(moment(), "day")) {
      return m.format("h:mm A");
    }
    return m.format("MMM D, YYYY");
  };

  const formatVideoTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.commentItem} key={item.id}>

      <View style={styles.headerRow}>
        <Image source={{ uri: item.user.profileImage }} style={styles.iamge} resizeMode='contain' />
        <Text style={styles.userName}>{item.user.name}</Text>
        <Text style={styles.timeText}> • {formatDate(item.createdAt)}</Text>
      </View>

      <View style={styles.bodyRow}>
        <TouchableOpacity onPress={() => onPressCommentTime(item)} style={{flexDirection:'row',marginRight: 6, alignItems:'center' }}>
          <Text style={styles.videoTime}>{item.videoTime}</Text>
          {item.drawing &&
            <MaterialCommunityIcons name="drawing-box" size={24} color="#333" style={{ marginLeft: 4 }} />
          }
        </TouchableOpacity>

        <Text style={styles.commentText}>{item.text}</Text>
      </View>

      <TouchableOpacity>
        <Text style={styles.replyText}>Reply</Text>
      </TouchableOpacity>
    </View>
  );

  const onPressCommentTime = async (value) => {
    if (!status.isLoaded) return;
    await videoRef.current.setPositionAsync(value.seekTime * 1000);
    console.log(value.drawing);
    if (value.drawing == null) {
      setPaths([]);
    } else {
      setPaths(value.drawing);
    }
  };

  const current = status.positionMillis ? status.positionMillis / 1000 : 0;
  const duration = status.durationMillis ? status.durationMillis / 1000 : 0;

  const onStartDrawing = (evt) => {
    if (!editMode) return;
    const { locationX, locationY } = evt.nativeEvent;
    setCurrentPath(`M${locationX} ${locationY}`);
    setDrawing(true);
  };

  const onChangeDrawing = (evt) => {
    if (!drawing) return;
    const { locationX, locationY } = evt.nativeEvent;
    setCurrentPath(prev => `${prev} L${locationX} ${locationY}`);
  };

  const onEndDrawing = () => {
    if (drawing) {
      setPaths([...paths, { d: currentPath, color }]);
      setCurrentPath('');
      setDrawing(false);
    }
  };

  const findDrawingForTime = (sec) => {
    const sameTime = comments.filter(c => Math.abs(c.seekTime - sec) < 0.5 && Array.isArray(c.drawing));
    return sameTime.length ? sameTime[0].drawing : null;
  };

  return (
    <View style={styles.container}>

      <Text style={{ marginVertical: 5, fontSize: 16, fontWeight: "700", alignSelf: 'center' }}>
        A clone UI
      </Text>
      <View>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: "https://www.w3schools.com/html/mov_bbb.mp4" }}
          resizeMode="contain"
          onPlaybackStatusUpdate={(st) => {
            setStatus(st);
            if (st.isLoaded) {
              const sec = st.positionMillis / 1000;
              const drawing = findDrawingForTime(sec);
              if (drawing) {
                setPaths(drawing);
                setEditMode(true);
              } else {
                setPaths([]);
                setEditMode(false);
              }
            }
          }}
        />
        <Slider
          style={{ flex: 1, }}
          minimumValue={0}
          maximumValue={1}
          value={duration ? current / duration : 0}
          onSlidingComplete={onControlTiming}
          minimumTrackTintColor="#2ecc71"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#2ecc71"
        />
      </View>

      {editMode && (
        <Svg
          style={{ ...StyleSheet.absoluteFillObject }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onStartDrawing}
          onResponderMove={onChangeDrawing}
          onResponderRelease={onEndDrawing}
        >
          {paths.map((p, i) => (
            <Path key={i} d={p.d} stroke={p.color} strokeWidth={3} fill="none" />
          ))}
          {currentPath !== '' && (
            <Path d={currentPath} stroke={color} strokeWidth={3} fill="none" />
          )}
        </Svg>
      )}

      <View style={styles.controls}>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={onPressPlayPause} style={{ paddingRight: 10 }}>
            {status.isPlaying ? (
              <MaterialIcons name="pause" size={24} color="#fff" />
            ) : (
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
            )}
          </TouchableOpacity>


          <TouchableOpacity onPress={onPressAudio}>
            <MaterialIcons
              name={status.isMuted ? "volume-off" : "volume-up"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.time}>
          {format(current)} / {format(duration)}
        </Text>

        <TouchableOpacity onPress={() => onPressFullScreen()}>
          <MaterialIcons name="fullscreen" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.commentHeader}>
        Comments ({comments.length})
      </Text>

      <FlatList
        data={comments}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        style={{ flex: 1 }}
      />

      <View style={{ borderColor: '#ccc', borderTopWidth: 1, paddingTop: 3 }}>
        {/* Avatar */}
        <View style={{ flexDirection: 'row', width: '100%', paddingBottom: 5 }}>
          <Image
            source={{ uri: "https://cdn.pixabay.com/photo/2014/03/25/16/32/user-297330_1280.png" }}
            style={styles.avatar}
            resizeMode='contain'
          />

          <TextInput
            placeholder="Write your comment..."
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            multiline={true}
            textAlignVertical="top"
          />
        </View>
        <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', paddingBottom: 3 }}>
          <View style={styles.timestampButton}>
            <Text style={styles.timestampText}> {format(current)} </Text>
          </View>

          <View style={{ flexDirection: 'row',alignItems:'center' }}>
            <TouchableOpacity style={styles.editIcon} onPress={() => setEditMode(!editMode)}>
            {editMode ?
              <MaterialIcons name="edit-square" size={24} color="#000"/>
              :
              <MaterialIcons name="edit" size={24} color="#000"/>
            }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.colorButton, { backgroundColor: color }]}
              onPress={() => setShowColors(!showColors)}
            />
            {showColors && (
              <View style={styles.colorOptions}>
                {colors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }]}
                    onPress={() => {
                      setColor(c);
                      setShowColors(false);
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.commentButton} onPress={addComment}>
            <Text style={styles.commentButtonText}>Comment</Text>
          </TouchableOpacity>

        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: "#fff",
    paddingBottom: 10
  },
  video: {
    width: "100%",
    height: 220,
    backgroundColor: "#000"
  },
  controls: {
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#000",
  },
  icon: {
    color: "#fff",
    fontSize: 18,
    marginHorizontal: 2,
    marginRight: 12
  },
  time: {
    color: "#fff",
    fontSize: 12,
  },
  commentHeader: {
    fontSize: 16,
    fontWeight: "700",
    margin: 10
  },
  commentItem: {
    backgroundColor: "#f9fff5",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  iamge: {
    width: 25,
    height: 25,
    borderRadius: 14,
    marginRight: 6
  },
  userName: {
    fontWeight: "700",
    fontSize: 14
  },
  timeText: {
    fontSize: 12,
    color: "#000"
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  videoTime: {
    color: "green",
    fontWeight: "bold",
  },
  commentText: {
    flex: 1,
    fontSize: 14
  },
  replyText: {
    fontSize: 13,
    color: "blue",
    marginTop: 2
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#fff",
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  commentInputContainer: {
    flexDirection: "column",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#fff",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  timestampButton: {
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#ddd",
    borderRadius: 12,
    marginRight: 6,
  },
  timestampText: {
    fontSize: 12,
    color: "#000",
  },
  commentInput: {
    flex: 1,
    paddingVertical: 6,
    marginRight: 10,
    fontSize: 14,
    height: 75,
    backgroundColor: '#ccc',
    borderRadius: 10,
    textAlignVertical: 'top',
  },
  editIcon: {
    paddingHorizontal: 6,
  },
  commentButton: {
    backgroundColor: "#7af",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  commentButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  colorButton: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  colorOptions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  colorOption: {
    width: 25,
    height: 25,
    borderRadius: 12,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});


