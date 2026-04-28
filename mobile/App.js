import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
}

export default function App() {
  const supabase = useMemo(createSupabaseClient, []);
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signInWithPassword() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error?.message || "Signed in.");
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setMessage(error?.message || "Open the browser to finish OAuth.");
  }

  async function loadVault() {
    const { data, error } = await supabase
      .schema("myformsvault")
      .from("FamilyMember")
      .select("id,fullName,householdName,basicInfo,schoolInfo,medicalInfo,insuranceInfo,emergencyInfo")
      .order("updatedAt", { ascending: false });

    setMembers(data || []);
    setMessage(error?.message || "Vault loaded.");
  }

  async function uploadPaperFormPhoto() {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }

    setMessage(
      "Camera capture is scaffolded. Connect the CameraView ref here, then upload the photo to /functions/v1/extract-form-fields.",
    );
  }

  async function enableDueDateNotifications() {
    await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        body: "A saved form is due soon.",
        title: "MyFormsVault reminder",
      },
      trigger: {
        seconds: 5,
      },
    });
    setMessage("Reminder notification scheduled.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>MyFormsVault Mobile</Text>
      <Text style={styles.copy}>Use the same Supabase project for auth, vault data, OCR intake, and reminders.</Text>

      {!session ? (
        <View style={styles.card}>
          <TextInput autoCapitalize="none" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
          <TextInput onChangeText={setPassword} placeholder="Password" secureTextEntry style={styles.input} value={password} />
          <Button title="Sign in" onPress={signInWithPassword} />
          <Button title="Sign in with Google" onPress={signInWithGoogle} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.heading}>Signed in</Text>
          <Button title="Load vault" onPress={loadVault} />
          <Button title="Upload paper form photo" onPress={uploadPaperFormPhoto} />
          <Button title="Enable due-date reminder" onPress={enableDueDateNotifications} />
          <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
        </View>
      )}

      <View style={styles.cameraPreview}>
        {permission?.granted ? <CameraView style={StyleSheet.absoluteFill} /> : <Text>Camera permission required.</Text>}
      </View>

      {members.map((member) => (
        <View key={member.id} style={styles.card}>
          <Text style={styles.heading}>{member.fullName}</Text>
          <Text>{member.householdName}</Text>
          <Text>{member.basicInfo?.phone || member.basicInfo?.email || "Vault profile"}</Text>
        </View>
      ))}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cameraPreview: {
    alignItems: "center",
    backgroundColor: "#dfe5ff",
    borderRadius: 18,
    height: 260,
    justifyContent: "center",
    overflow: "hidden",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 18,
    gap: 10,
    padding: 16,
  },
  container: {
    backgroundColor: "#f4f6ff",
    gap: 16,
    padding: 22,
    paddingTop: 64,
  },
  copy: {
    color: "#4f5d87",
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
  },
  input: {
    borderColor: "#cfd7ff",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  message: {
    color: "#4330a8",
    fontWeight: "700",
  },
  title: {
    color: "#060817",
    fontSize: 34,
    fontWeight: "900",
  },
});
