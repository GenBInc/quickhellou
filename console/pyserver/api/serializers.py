from accounts.models import (User, )
from dashboard.models import (
    Widget,
    Communication,
    CommunicationSession,
)
from rest_framework import serializers
from rest_framework.serializers import (CharField, IntegerField)


class CommunicationSessionSerializer(serializers.ModelSerializer):
    id = IntegerField(label='id', read_only=True)

    class Meta:
        model = CommunicationSession
        fields = ('id', 'uuid', 'status')
        read_only_fields = ('id',)


class CommunicationSerializer(serializers.ModelSerializer):
    id = IntegerField(label='id', read_only=True)
    widget_uuid = CharField(write_only=True)
    caller_id = IntegerField(write_only=True)
    widget = serializers.SlugRelatedField(
        read_only=True, many=False, slug_field='uuid')
    sessions = CommunicationSessionSerializer(source='communicationsession_set',
                                              many=True, read_only=True)

    class Meta:
        model = Communication
        fields = ('id', 'caller_name', 'caller_id',
                  'widget', 'sessions', 'widget_uuid')
        read_only_fields = ('sessions',)

    def get_communicationsession_set(self, instance):
        objs = []
        a = instance.communicationsession_set.all()
        for i in a:
            objs.append({'uuid': i.uuid, 'status': i.status})
        return objs

    def create(self, validated_data):

        widget = Widget.objects.get(uuid=validated_data['widget_uuid'])

        # get user
        try:
            client_user = User.objects.get(id=validated_data['caller_id'])
        except:
            print('no user by given id', validated_data['caller_id'])

        # get or create communication
        try:
            communication = Communication.objects.get(caller=client_user)
            communication.caller_name = validated_data['caller_name']
            communication.status = 1
            communication.save()
        except:
            communication = Communication.objects.create(caller=client_user, caller_name=validated_data['caller_name'],
                                                         client_board=widget.client_board, widget=widget)
            communication.save()

        # create communication session
        comSession = CommunicationSession.objects.create_session(communication)

        return communication


class WidgetSerializer(serializers.HyperlinkedModelSerializer):
    client_board_id = CharField(source='client_board.uuid')
    assignees = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True)

    class Meta:
        model = Widget
        fields = ('id', 'uuid', 'assignees', 'client_board_id')


class UserSerializer(serializers.HyperlinkedModelSerializer):
    client_board_id = CharField(source='client_board.uuid')
    thumbnail = CharField(source='profile.thumbnail')
    full_name = CharField(source='profile.full_name')
    widget_list = serializers.SerializerMethodField()

    def get_widget_list(self, instance):
        ids = []
        a = instance.widget_user.all()
        for i in a:
            ids.append({'id': i.uuid, 'is_installed': i.is_installed})
        return ids

    class Meta:
        model = User
        fields = ('id', 'uuid', 'full_name', 'thumbnail',
                  'widget_list', 'client_board_id')
