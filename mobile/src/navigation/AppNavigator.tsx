// Import React hooks for component lifecycle and state management
import React, { useEffect, useRef } from 'react';
// Import essential layout and UI feedback components from React Native
import { ActivityIndicator, View } from 'react-native';
// Import NavigationContainer to wrap the app and useNavigationContainerRef for programmatic portal navigation
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
// Import optimized native navigator builders
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
// Import community-standard icons
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import themed text component for consistent UI styling
import { Text } from 'react-native-paper';
// Import auth store to derive navigation state from user session
import { useAuthStore } from '../store';
// Import push notification library for deep-link handling
import * as Notifications from 'expo-notifications';
// Import custom push utilities for token orchestration
import { usePushNotifications } from '../utils/pushNotifications';
// Import auth API to register hardware tokens with the server
import { authAPI } from '../services/api';

// ── Auth Screens ──
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// ── Onboarding Screens (authenticated users without a society) ──
import OnboardingChoiceScreen from '../screens/Auth/OnboardingChoiceScreen';
import JoinSocietyScreen from '../screens/Auth/JoinSocietyScreen';
import CreateSocietyScreen from '../screens/Auth/CreateSocietyScreen';

// ── KYC/Pending State ──
import PendingApprovalScreen from '../screens/Auth/PendingApprovalScreen';

// ── Feature Domain Screens ──
import DashboardScreen from '../screens/Home/DashboardScreen';
import BillsListScreen from '../screens/Bills/BillsListScreen';
import BillDetailScreen from '../screens/Bills/BillDetailScreen';
import CreateBillScreen from '../screens/Bills/CreateBillScreen';
import PaymentHistoryScreen from '../screens/Bills/PaymentHistoryScreen';
import ComplaintsListScreen from '../screens/Complaints/ComplaintsListScreen';
import ComplaintDetailScreen from '../screens/Complaints/ComplaintDetailScreen';
import CreateComplaintScreen from '../screens/Complaints/CreateComplaintScreen';
import PollsListScreen from '../screens/Polls/PollsListScreen';
import PollDetailScreen from '../screens/Polls/PollDetailScreen';
import CreatePollScreen from '../screens/Polls/CreatePollScreen';
import ReimbursementsListScreen from '../screens/Reimbursements/ReimbursementsListScreen';
import ReimbursementDetailScreen from '../screens/Reimbursements/ReimbursementDetailScreen';
import CreateReimbursementScreen from '../screens/Reimbursements/CreateReimbursementScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import SocietyInfoScreen from '../screens/Society/SocietyInfoScreen';
import ResidentDirectoryScreen from '../screens/Directory/ResidentDirectoryScreen';
import AnnouncementsScreen from '../screens/Announcements/AnnouncementsScreen';
import ApprovalManagementScreen from '../screens/Auth/ApprovalManagementScreen';
import SocietyExpensesListScreen from '../screens/Expenses/SocietyExpensesListScreen';
import CreateSocietyExpenseScreen from '../screens/Expenses/CreateSocietyExpenseScreen';
import SocietyExpenseDetailScreen from '../screens/Expenses/SocietyExpenseDetailScreen';
import SocietyDocumentsListScreen from '../screens/Documents/SocietyDocumentsListScreen';
import UploadDocumentScreen from '../screens/Documents/UploadDocumentScreen';
import DocumentDetailScreen from '../screens/Documents/DocumentDetailScreen';

// Initialize specialized stack builders
const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const HomeStack = createNativeStackNavigator();
const BillsStack = createNativeStackNavigator();
const ComplaintsStack = createNativeStackNavigator();
const PollsStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

/**
 * Global Screen Options:
 * Projects a unified theme (Space Navy) and consistent header typography across all stacks.
 */
const screenOptions = {
  headerStyle: { backgroundColor: '#0F0F1A' },
  headerTintColor: '#E8E8F0',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
  contentStyle: { backgroundColor: '#0F0F1A' },
  // Custom header title implementation for better padding and control
  headerTitle: (props: any) => (
    <View style={{ paddingVertical: 20 }}>
      <Text style={{
        color: props.tintColor,
        fontSize: 20,
        fontWeight: 'bold',
      }}>
        {props.children}
      </Text>
    </View>
  ),
};

// ── Sub-Stack Navigators ──

/**
 * Home Activity Stack:
 * Handles the main landing area, notifications, and core society management reports.
 */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <HomeStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <HomeStack.Screen name="ApprovalManagement" component={ApprovalManagementScreen} options={{ title: 'Approvals' }} />
      <HomeStack.Screen name="SocietyInfo" component={SocietyInfoScreen} options={{ title: 'Society Info' }} />
      <HomeStack.Screen name="ResidentDirectory" component={ResidentDirectoryScreen} options={{ title: 'Residents' }} />
      <HomeStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payments' }} />
      <HomeStack.Screen name="ReimbursementsList" component={ReimbursementsListScreen} options={{ title: 'Reimbursements' }} />
      <HomeStack.Screen name="ReimbursementDetail" component={ReimbursementDetailScreen} options={{ title: 'Reimbursement' }} />
      <HomeStack.Screen name="CreateReimbursement" component={CreateReimbursementScreen} options={{ title: 'New Reimbursement' }} />
      <HomeStack.Screen name="SocietyExpensesList" component={SocietyExpensesListScreen} options={{ title: 'Society Expenses' }} />
      <HomeStack.Screen name="SocietyExpenseDetail" component={SocietyExpenseDetailScreen} options={{ title: 'Expense Detail' }} />
      <HomeStack.Screen name="CreateSocietyExpense" component={CreateSocietyExpenseScreen} options={{ title: 'New Expense' }} />
      <HomeStack.Screen name="SocietyDocumentsList" component={SocietyDocumentsListScreen} options={{ title: 'Documents' }} />
      <HomeStack.Screen name="UploadDocument" component={UploadDocumentScreen} options={{ title: 'Upload Document' }} />
      <HomeStack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Document' }} />
    </HomeStack.Navigator>
  );
}

/**
 * Democracy Stack:
 * Dedicated flow for voting and viewing community survey results.
 */
function PollsStackNavigator() {
  return (
    <PollsStack.Navigator screenOptions={screenOptions}>
      <PollsStack.Screen name="PollsList" component={PollsListScreen} options={{ title: 'Polls' }} />
      <PollsStack.Screen name="PollDetail" component={PollDetailScreen} options={{ title: 'Poll' }} />
      <PollsStack.Screen name="CreatePoll" component={CreatePollScreen} options={{ title: 'New Poll' }} />
    </PollsStack.Navigator>
  );
}

/**
 * Finance Stack:
 * Orchestrates billing cycles, resident payments, and administrative expense tracking.
 */
function BillsStackNavigator() {
  return (
    <BillsStack.Navigator screenOptions={screenOptions}>
      <BillsStack.Screen name="BillsList" component={BillsListScreen} options={{ title: 'Bills' }} />
      <BillsStack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Detail' }} />
      <BillsStack.Screen name="CreateBillScreen" component={CreateBillScreen} options={{ title: 'Create Bill' }} />
      <BillsStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payments' }} />
      <BillsStack.Screen name="SocietyExpensesList" component={SocietyExpensesListScreen} options={{ title: 'Society Expenses' }} />
      <BillsStack.Screen name="SocietyExpenseDetail" component={SocietyExpenseDetailScreen} options={{ title: 'Expense Detail' }} />
      <BillsStack.Screen name="CreateSocietyExpense" component={CreateSocietyExpenseScreen} options={{ title: 'New Expense' }} />
    </BillsStack.Navigator>
  );
}

/**
 * Helpdesk Stack:
 * Focuses on grievance reporting and two-way resolution tracking.
 */
function ComplaintsStackNavigator() {
  return (
    <ComplaintsStack.Navigator screenOptions={screenOptions}>
      <ComplaintsStack.Screen name="ComplaintsList" component={ComplaintsListScreen} options={{ title: 'Complaints' }} />
      <ComplaintsStack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ title: 'Complaint' }} />
      <ComplaintsStack.Screen name="CreateComplaint" component={CreateComplaintScreen} options={{ title: 'New Complaint' }} />
    </ComplaintsStack.Navigator>
  );
}

/**
 * Profile & Settings Stack:
 * Acts as an overflow menu for less frequent interactions and personal configuration.
 */
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={screenOptions}>
      <MoreStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <MoreStack.Screen name="SocietyInfo" component={SocietyInfoScreen} options={{ title: 'Society Info' }} />
      <MoreStack.Screen name="ResidentDirectory" component={ResidentDirectoryScreen} options={{ title: 'Residents' }} />
      <MoreStack.Screen name="ReimbursementsList" component={ReimbursementsListScreen} options={{ title: 'Reimbursements' }} />
      <MoreStack.Screen name="ReimbursementDetail" component={ReimbursementDetailScreen} options={{ title: 'Reimbursement' }} />
      <MoreStack.Screen name="CreateReimbursement" component={CreateReimbursementScreen} options={{ title: 'New Reimbursement' }} />
      <MoreStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Announcements' }} />
      <MoreStack.Screen name="ApprovalManagement" component={ApprovalManagementScreen} options={{ title: 'Approvals' }} />
      <MoreStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Payments' }} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <MoreStack.Screen name="SocietyExpensesList" component={SocietyExpensesListScreen} options={{ title: 'Society Expenses' }} />
      <MoreStack.Screen name="SocietyExpenseDetail" component={SocietyExpenseDetailScreen} options={{ title: 'Expense Detail' }} />
      <MoreStack.Screen name="CreateSocietyExpense" component={CreateSocietyExpenseScreen} options={{ title: 'New Expense' }} />
      <MoreStack.Screen name="SocietyDocumentsList" component={SocietyDocumentsListScreen} options={{ title: 'Documents' }} />
      <MoreStack.Screen name="UploadDocument" component={UploadDocumentScreen} options={{ title: 'Upload Document' }} />
      <MoreStack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ title: 'Document' }} />
    </MoreStack.Navigator>
  );
}

// ── Unified Bottom Navigation ──

/**
 * MainTabs:
 * The primary navigation hub of the app, using TopTabs inside Bottom container for smooth swiping.
 */
function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      keyboardDismissMode="on-drag"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: false,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        // Visual indicator shown at the TOP of the bottom bar
        tabBarIndicatorStyle: { top: 0, backgroundColor: '#7C4DFF', height: 2 },
        tabBarStyle: {
          backgroundColor: '#0F0F1A',
          borderTopColor: '#1A1A2E',
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 26,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          textTransform: 'none',
          marginTop: -2,
        },
        tabBarItemStyle: {
          padding: 0,
        },
        tabBarActiveTintColor: '#7C4DFF',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home" color={color} size={24} />,
        }}
      />
      <Tab.Screen name="BillsTab" component={BillsStackNavigator}
        options={{
          title: 'Bills',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="receipt" color={color} size={24} />,
        }}
      />
      <Tab.Screen name="ComplaintsTab" component={ComplaintsStackNavigator}
        options={{
          title: 'Complaints',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="message-alert" color={color} size={24} />,
        }}
      />
      <Tab.Screen name="PollsTab" component={PollsStackNavigator}
        options={{
          title: 'Polls',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="vote" color={color} size={24} />,
        }}
      />
      <Tab.Screen name="MoreTab" component={MoreStackNavigator}
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="dots-horizontal" color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * AuthStack:
 * Gateway navigator for unauthenticated guests.
 */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

/**
 * OnboardingStack:
 * Temporary flow for a verified user who hasn't yet selected an organization.
 */
function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="OnboardingChoice" component={OnboardingChoiceScreen} />
      <Stack.Screen name="JoinSociety" component={JoinSocietyScreen} />
      <Stack.Screen name="CreateSociety" component={CreateSocietyScreen} />
    </Stack.Navigator>
  );
}

/**
 * NOTIF_NAV_MAP:
 * Bridges push notification data payloads to internal navigation paths.
 * Allows 'Smart Routing' — clicking a pill notification takes you straight to the relevant detail screen.
 */
const NOTIF_NAV_MAP: Record<string, { tab: string; screen: string; paramKey: string }> = {
  bill: { tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  payment_reminder: { tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  complaint: { tab: 'ComplaintsTab', screen: 'ComplaintDetail', paramKey: 'complaintId' },
  poll: { tab: 'PollsTab', screen: 'PollDetail', paramKey: 'pollId' },
  reimbursement: { tab: 'MoreTab', screen: 'ReimbursementDetail', paramKey: 'requestId' },
  announcement: { tab: 'HomeTab', screen: 'Announcements', paramKey: '' },
};


export default function AppNavigator() {
  // Extract reactive session state from the global store
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  // Persistent reference for programmatic navigation actions
  const navigationRef = useNavigationContainerRef<any>();

  // Hook into hardware-level notification events
  const { expoPushToken, notificationResponse } = usePushNotifications();

  // Side-effect: Sync hardware push token with the backend profile once we have identity and permission
  useEffect(() => {
    if (isAuthenticated && user?.is_fully_approved && expoPushToken) {
      authAPI.registerPushToken(expoPushToken.data)
        .then(() => console.log('Push token registered with backend'))
        .catch((e) => console.warn('Failed to register push token with backend:', e));
    }
  }, [isAuthenticated, user?.is_fully_approved, expoPushToken]);

  // Track if the React Navigation context is ready to receive instructions
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);

  /**
   * getNavigationState:
   * Finite State Machine for app identity and access control.
   */
  const getNavigationState = () => {
    if (!isAuthenticated || !user) return 'auth';
    if (!user.society_id) return 'onboarding'; // No org selected
    if (!user.is_fully_approved) return 'pending'; // Awaiting KYC/Admin approval
    return 'main'; // Full access
  };

  const state = getNavigationState();

  // Watch for notification interactions; trigger routing once the container is ready and user is in 'main' state
  useEffect(() => {
    if (notificationResponse && isNavigationReady && state === 'main') {
      handleNotificationTap(notificationResponse);
    }
  }, [notificationResponse, isNavigationReady, state]);

  /**
   * handleNotificationTap:
   * Maps incoming notification data to a nested navigation jump.
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as {
      type?: string;
      reference_id?: string;
    };

    if (!data?.type || !navigationRef.isReady()) return;

    const mapping = NOTIF_NAV_MAP[data.type];
    if (mapping) {
      if (!data.reference_id) {
        // Simple screen jump (e.g., Announcements feed)
        (navigationRef as any).navigate(mapping.tab, {
          screen: mapping.screen,
        });
      } else {
        // Parameterized jump (e.g., specific Bill detail)
        (navigationRef as any).navigate(mapping.tab, {
          screen: mapping.screen,
          params: { [mapping.paramKey]: data.reference_id },
        });
      }
    }
  };

  // Show a premium splash indicator while hydrating the secure storage and auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C4DFF" />
      </View>
    );
  }

  // Render the appropriate navigator based on the calculated identity state
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setIsNavigationReady(true)}
    >
      {state === 'auth' && <AuthStack />}
      {state === 'onboarding' && <OnboardingStack />}
      {state === 'pending' && (
        <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        </Stack.Navigator>
      )}
      {state === 'main' && <MainTabs />}
    </NavigationContainer>
  );
}
